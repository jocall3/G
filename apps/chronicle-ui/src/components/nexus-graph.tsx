import React, { useEffect, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Position,
} from 'react-flow-renderer';
import dagre from 'dagre';

import 'react-flow-renderer/dist/style.css';

// Define the structure for incoming data from the Nexus service
export interface NexusNodeData {
  label: string;
  type?: string;
  details?: Record<string, any>;
}

export interface NexusNode {
  id: string;
  data: NexusNodeData;
}

export interface NexusEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface NexusGraphData {
  nodes: NexusNode[];
  edges: NexusEdge[];
}

interface NexusGraphProps {
  nexusData: NexusGraphData;
  direction?: 'TB' | 'LR'; // Layout direction: Top-to-Bottom or Left-to-Right
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

/**
 * Uses the Dagre library to calculate automatic layouts for nodes.
 * @param nodes - The nodes to be laid out.
 * @param edges - The edges connecting the nodes.
 * @param direction - The layout direction ('TB' or 'LR').
 * @returns An object containing the layouted nodes and edges.
 */
const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // We are shifting the dagre node position (anchor=center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes: layoutedNodes, edges };
};

const NexusGraphComponent: React.FC<NexusGraphProps> = ({ nexusData, direction = 'TB' }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!nexusData || !nexusData.nodes || nexusData.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const initialNodes: Node<NexusNodeData>[] = nexusData.nodes.map((node) => ({
      id: node.id,
      type: 'default', // Can be extended with custom node types
      data: node.data,
      position: { x: 0, y: 0 }, // Initial position, will be updated by layout
    }));

    const initialEdges: Edge[] = nexusData.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep', // Or 'default', 'step', 'straight'
      animated: true,
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      direction
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nexusData, direction, setNodes, setEdges]);

  const onConnect = (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds));

  const nodeTypes = useMemo(() => ({
    // Add custom node types here if needed, e.g.:
    // customNode: CustomNodeComponent,
  }), []);

  if (!nexusData || !nexusData.nodes || nexusData.nodes.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        No data to display in the graph.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'input':
                return '#0041d0';
              case 'output':
                return '#ff0072';
              default:
                return '#4a4a4a';
            }
          }}
          nodeStrokeWidth={3}
        />
        <Background gap={16} color="#f1f1f1" variant="dots" />
      </ReactFlow>
    </div>
  );
};

/**
 * A wrapper component that provides the ReactFlowProvider context.
 * This is the component that should be imported and used in the application.
 */
const NexusGraph: React.FC<NexusGraphProps> = (props) => (
  <ReactFlowProvider>
    <NexusGraphComponent {...props} />
  </ReactFlowProvider>
);

export default NexusGraph;