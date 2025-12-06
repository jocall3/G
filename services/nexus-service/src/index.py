import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from neo4j import GraphDatabase, Driver
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Nexus Service",
    description="Ingests events to build a holographic web of consequence in a graph database.",
    version="0.1.0"
)

# --- Neo4j Configuration ---
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

driver: Optional[Driver] = None

@app.on_event("startup")
async def startup_db_client():
    """
    Connects to the Neo4j database on application startup.
    """
    global driver
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        logger.info("Successfully connected to Neo4j.")
    except Exception as e:
        logger.error(f"Failed to connect to Neo4j at {NEO4J_URI}: {e}")
        # Raise an exception to prevent the application from starting without a database connection
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to connect to graph database: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """
    Closes the Neo4j database connection on application shutdown.
    """
    if driver:
        driver.close()
        logger.info("Neo4j connection closed.")

# --- Pydantic Models for Event Ingestion ---

class NodeDefinition(BaseModel):
    """Defines a node to be created or updated in the graph."""
    label: str = Field(..., description="The primary label for the node (e.g., 'User', 'Account', 'Transaction').")
    properties: Dict[str, Any] = Field(..., description="Key-value pairs for node properties. Must include a unique identifier like 'id', 'user_id', etc.")

class RelationshipDefinition(BaseModel):
    """Defines a relationship to be created or updated between two nodes."""
    source_node: NodeDefinition = Field(..., description="Definition of the source node for the relationship.")
    target_node: NodeDefinition = Field(..., description="Definition of the target node for the relationship.")
    type: str = Field(..., description="The type of relationship (e.g., 'OWNS', 'PERFORMED', 'CAUSED_BY').")
    properties: Optional[Dict[str, Any]] = Field(None, description="Optional key-value pairs for relationship properties.")

class IngestEventRequest(BaseModel):
    """
    Represents an event to be ingested by the Nexus service.
    It can contain raw data and/or explicit instructions for graph manipulation.
    """
    event_type: str = Field(..., description="A descriptive type for the event (e.g., 'USER_CREATED', 'TRANSACTION_INITIATED').")
    source_service: str = Field(..., description="The name of the service that originated this event.")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of when the event occurred.")
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique identifier for this event.")
    
    data: Dict[str, Any] = Field(..., description="The raw data payload of the event. This can be interpreted by the Nexus to create graph elements.")

    nodes_to_create_or_update: Optional[List[NodeDefinition]] = Field(None, description="Optional: Explicit nodes to create or update based on this event.")
    relationships_to_create_or_update: Optional[List[RelationshipDefinition]] = Field(None, description="Optional: Explicit relationships to create or update based on this event.")


# --- Graph Operations ---

def _get_unique_id_property(properties: Dict[str, Any]) -> Optional[str]:
    """
    Heuristically finds a suitable unique identifier property from a dictionary of properties.
    Prioritizes keys containing 'id' (case-insensitive).
    """
    for key in properties:
        if 'id' in key.lower():
            return key
    return None

def _create_or_update_node(tx, node_def: NodeDefinition):
    """
    Creates or updates a node in the graph using MERGE.
    It attempts to find a unique ID property for the MERGE clause.
    """
    label = node_def.label
    properties = node_def.properties

    unique_prop_key = _get_unique_id_property(properties)

    if not unique_prop_key:
        logger.warning(f"NodeDefinition for label '{label}' lacks an 'id'-like property. Using all properties for MERGE, which might not be unique: {properties}")
        # Fallback: If no unique ID, MERGE on all properties. This is less efficient and might not be truly unique.
        cypher_query = f"""
        MERGE (n:{label} $props)
        SET n = $props
        RETURN n
        """
        tx.run(cypher_query, props=properties)
    else:
        # Use MERGE on the unique property to create or find the node, then SET all properties to ensure updates
        cypher_query = f"""
        MERGE (n:{label} {{{unique_prop_key}: $props.{unique_prop_key}}})
        SET n = $props
        RETURN n
        """
        tx.run(cypher_query, props=properties)
    logger.debug(f"Node {label} with {unique_prop_key}={properties.get(unique_prop_key)} created/updated.")


def _create_or_update_relationship(tx, rel_def: RelationshipDefinition):
    """
    Creates or updates a relationship between two nodes.
    It ensures both source and target nodes exist (or are created) before forming the relationship.
    """
    source_label = rel_def.source_node.label
    source_props = rel_def.source_node.properties
    target_label = rel_def.target_node.label
    target_props = rel_def.target_node.properties
    rel_type = rel_def.type
    rel_properties = rel_def.properties or {}

    source_unique_prop_key = _get_unique_id_property(source_props)
    target_unique_prop_key = _get_unique_id_property(target_props)

    if not source_unique_prop_key or not target_unique_prop_key:
        logger.error(f"Missing unique ID property for source ({source_label}) or target ({target_label}) node in relationship {rel_type}.")
        raise ValueError("Source and target nodes must have a unique ID property for relationship creation.")

    # MERGE source and target nodes, then MERGE the relationship
    cypher_query = f"""
    MERGE (source:{source_label} {{{source_unique_prop_key}: $source_props.{source_unique_prop_key}}})
    SET source += $source_props
    MERGE (target:{target_label} {{{target_unique_prop_key}: $target_props.{target_unique_prop_key}}})
    SET target += $target_props
    MERGE (source)-[r:{rel_type}]->(target)
    SET r += $rel_properties
    RETURN source, r, target
    """
    tx.run(cypher_query, source_props=source_props, target_props=target_props, rel_properties=rel_properties)
    logger.debug(f"Relationship {rel_type} created/updated between {source_label} and {target_label}.")


def process_event_in_graph(event: IngestEventRequest):
    """
    Processes an incoming event to create/update nodes and relationships in the graph.
    This function orchestrates the graph manipulation based on the event's content.
    """
    if not driver:
        logger.error("Neo4j driver not initialized.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Graph database not connected.")

    with driver.session(database=NEO4J_DATABASE) as session:
        try:
            session.write_transaction(_process_event_transaction, event)
            logger.info(f"Event {event.event_id} processed successfully in graph.")
        except Exception as e:
            logger.error(f"Error processing event {event.event_id} in graph: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process event in graph: {e}")

def _process_event_transaction(tx, event: IngestEventRequest):
    """
    Neo4j transaction function to handle the detailed processing of an event.
    It creates an Event node and links it to affected entities.
    """
    # 1. Create the Event node itself
    event_node_props = {
        "event_id": event.event_id,
        "event_type": event.event_type,
        "source_service": event.source_service,
        "timestamp": event.timestamp.isoformat(),
        "raw_data": str(event.data) # Store raw data as a string property for auditing/debugging
    }
    tx.run(
        "MERGE (e:Event {event_id: $event_id}) SET e += $props",
        event_id=event.event_id,
        props=event_node_props
    )
    logger.debug(f"Event node {event.event_id} created/updated.")

    # 2. Process explicit nodes and relationships if provided
    if event.nodes_to_create_or_update:
        for node_def in event.nodes_to_create_or_update:
            _create_or_update_node(tx, node_def)
            # Link the event to the node it created/updated
            unique_prop_key = _get_unique_id_property(node_def.properties)
            if unique_prop_key:
                tx.run(
                    f"""
                    MATCH (e:Event {{event_id: $event_id}})
                    MATCH (n:{node_def.label} {{{unique_prop_key}: $node_id}})
                    MERGE (e)-[:CAUSED_OR_AFFECTED]->(n)
                    """,
                    event_id=event.event_id,
                    node_id=node_def.properties[unique_prop_key]
                )
                logger.debug(f"Event {event.event_id} linked to node {node_def.label} with {unique_prop_key}={node_def.properties[unique_prop_key]}.")

    if event.relationships_to_create_or_update:
        for rel_def in event.relationships_to_create_or_update:
            _create_or_update_relationship(tx, rel_def)
            
            # Ensure source and target nodes of the relationship are also linked to the event
            for node_def in [rel_def.source_node, rel_def.target_node]:
                unique_prop_key = _get_unique_id_property(node_def.properties)
                if unique_prop_key:
                    # Ensure the node exists (MERGE) and then link to event
                    _create_or_update_node(tx, node_def) # This ensures the node exists before linking
                    tx.run(
                        f"""
                        MATCH (e:Event {{event_id: $event_id}})
                        MATCH (n:{node_def.label} {{{unique_prop_key}: $node_id}})
                        MERGE (e)-[:CAUSED_OR_AFFECTED]->(n)
                        """,
                        event_id=event.event_id,
                        node_id=node_def.properties[unique_prop_key]
                    )
                    logger.debug(f"Event {event.event_id} linked to node {node_def.label} with {unique_prop_key}={node_def.properties[unique_prop_key]} (via relationship).")

    # 3. Generic interpretation of 'data' payload (if no explicit graph instructions were provided)
    # This section can be expanded with more sophisticated rules to infer graph elements
    # from unstructured or semi-structured 'data' payloads.
    if not event.nodes_to_create_or_update and not event.relationships_to_create_or_update:
        # Attempt to infer a 'primary_entity' from the 'data' payload
        if "primary_entity" in event.data and isinstance(event.data["primary_entity"], dict):
            try:
                primary_entity_def = NodeDefinition(**event.data["primary_entity"])
                _create_or_update_node(tx, primary_entity_def)
                
                # Link the event to its primary entity with a specific 'CAUSED' relationship
                unique_prop_key = _get_unique_id_property(primary_entity_def.properties)
                if unique_prop_key:
                    tx.run(
                        f"""
                        MATCH (e:Event {{event_id: $event_id}})
                        MATCH (n:{primary_entity_def.label} {{{unique_prop_key}: $node_id}})
                        MERGE (e)-[:CAUSED]->(n)
                        """,
                        event_id=event.event_id,
                        node_id=primary_entity_def.properties[unique_prop_key]
                    )
                    logger.debug(f"Event {event.event_id} linked to primary entity {primary_entity_def.label} with {unique_prop_key}={primary_entity_def.properties[unique_prop_key]}.")

            except Exception as e:
                logger.warning(f"Could not infer primary_entity from event data for event {event.event_id}: {e}")
        
        logger.info(f"Event {event.event_id} processed with generic data interpretation (no explicit graph instructions).")


# --- API Endpoints ---

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint to verify service and database connectivity.
    """
    if driver:
        try:
            driver.verify_connectivity()
            return {"status": "ok", "database": "connected"}
        except Exception as e:
            logger.error(f"Health check failed: Neo4j connectivity issue: {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database connection failed: {e}")
    else:
        logger.error("Health check failed: Neo4j driver not initialized.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database driver not initialized.")

@app.post("/ingest-event", status_code=status.HTTP_202_ACCEPTED)
async def ingest_event(event: IngestEventRequest):
    """
    Ingests an event into the Nexus, creating or updating nodes and relationships
    in the graph database to build the holographic web of consequence.
    """
    logger.info(f"Received event: {event.event_type} from {event.source_service} (ID: {event.event_id})")
    try:
        process_event_in_graph(event)
        return {"message": "Event accepted for processing", "event_id": event.event_id}
    except HTTPException as e:
        raise e # Re-raise FastAPI HTTPExceptions
    except Exception as e:
        logger.error(f"Unhandled error during event ingestion for {event.event_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {e}")