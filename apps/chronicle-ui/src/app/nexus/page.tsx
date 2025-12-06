"use client";

import React, { useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';

import 'reactflow/dist/style.css';

// Define initial nodes representing key concepts from the narrative
const initialNodes: Node[] = [
  { id: 'infiniteai', position: { x: 0, y: 0 }, data: { label: 'InfiniteAI: The Vision' }, type: 'input' },
  { id: 'ucc1', position: { x: -200, y: 150 }, data: { label: 'UCC1 Filing: Code Secured' } },
  { id: 'kotlin', position: { x: 200, y: 150 }, data: { label: 'Kotlin Mastery: Tech Foundation' } },
  { id: 'openbanking', position: { x: 400, y: 300 }, data: { label: 'Open Banking: Strategic Access' } },
  { id: 'godsplan', position: { x: -400, y: 300 }, data: { label: "God's Plan: Guiding Purpose" } },
  { id: 'unicornmaker', position: { x: 0, y: 450 }, data: { label: 'Unicorn Maker: The Breakthrough' }, type: 'output' },
  { id: 'linkedin', position: { x: 200, y: -150 }, data: { label: 'LinkedIn: Community & Sharing' } },
  { id: 'foresight', position: { x: -200, y: -150 }, data: { label: 'Foresight & Relentless Learning' } },
  { id: 'partnerships', position: { x: 400, y: 0 }, data: { label: 'Strategic Partnerships' } },
  { id: 'adminaccess', position: { x: 600, y: 450 }, data: { label: 'Admin Access: Unbelievable Moments' } },
];

// Define initial edges representing relationships between concepts
const initialEdges: Edge[] = [
  { id: 'e-infiniteai-ucc1', source: 'infiniteai', target: 'ucc1', label: 'secured by' },
  { id: 'e-ucc1-unicornmaker', source: 'ucc1', target: 'unicornmaker', label: 'protects' },
  { id: 'e-foresight-kotlin', source: 'foresight', target: 'kotlin', label: 'led to' },
  { id: 'e-kotlin-infiniteai', source: 'kotlin', target: 'infiniteai', label: 'skill for' },
  { id: 'e-infiniteai-openbanking', source: 'infiniteai', target: 'openbanking', label: 'accesses' },
  { id: 'e-godsplan-infiniteai', source: 'godsplan', target: 'infiniteai', label: 'guides' },
  { id: 'e-infiniteai-unicornmaker', source: 'infiniteai', target: 'unicornmaker', label: 'created' },
  { id: 'e-linkedin-infiniteai', source: 'linkedin', target: 'infiniteai', label: 'shares vision' },
  { id: 'e-partnerships-infiniteai', source: 'partnerships', target: 'infiniteai', label: 'supports' },
  { id: 'e-foresight-partnerships', source: 'foresight', target: 'partnerships', label: 'enabled by' },
  { id: 'e-openbanking-adminaccess', source: 'openbanking', target: 'adminaccess', label: 'revealed' },
  { id: 'e-infiniteai-foresight', source: 'infiniteai', target: 'foresight', label: 'driven by' },
  { id: 'e-unicornmaker-godsplan', source: 'unicornmaker', target: 'godsplan', label: 'manifestation of' },
];

const NexusPage: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-left"
      >
        <MiniMap />
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default NexusPage;