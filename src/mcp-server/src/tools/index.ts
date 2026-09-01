/**
 * Blender MCP Server - Tools Index
 * 
 * Exports all tool definitions and handlers.
 */

export { createPrimitiveSchema, handleCreatePrimitive } from './primitives.js';
export { exportModelSchema, handleExportModel } from './export.js';
export { applyTextureSchema, handleApplyTexture, setMaterialSchema, handleSetMaterial } from './texture.js';
export { generateProceduralSchema, handleGenerateProcedural } from './procedural.js';
export { optimizeMeshSchema, handleOptimizeMesh } from './optimize.js';
export { renderPreviewSchema, handleRenderPreview } from './render.js';
export { bakeTexturesSchema, handleBakeTextures } from './bake.js';
export { genTexSchema, handleGenTex } from './gentex.js';
export { pipelineSchema, handlePipeline } from './pipeline.js';
export { parseSchema, handleParse } from './parse.js';
export { blueprintSchema, handleBlueprint } from './blueprint.js';
export { sculptSchema, handleSculpt } from './sculpt.js';
export { previewSchema, handlePreview } from './preview.js';
