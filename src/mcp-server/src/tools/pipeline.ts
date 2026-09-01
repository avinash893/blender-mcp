/**
 * Blender MCP Server - Pipeline Tool
 * Forces step-by-step workflow with confirmations
 * Token-optimized
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';

// Pipeline state storage (in-memory)
const pipelineState: Map<string, {
    steps: string[];
    currentStep: number;
    context: Record<string, unknown>;
    createdAt: number;
}> = new Map();

export const pipelineSchema = {
    action: z.enum(['start', 'next', 'back', 'status', 'cancel'])
        .describe('start=new pipeline, next=proceed, back=redo, status=check, cancel=abort'),
    task: z.string().optional()
        .describe('Task description (for start action)'),
    id: z.string().optional()
        .describe('Pipeline ID (auto-generated on start)'),
};

export type PipelineParams = {
    action: 'start' | 'next' | 'back' | 'status' | 'cancel';
    task?: string;
    id?: string;
};

/**
 * Analyze task and generate steps
 */
function analyzeTask(task: string): string[] {
    const taskLower = task.toLowerCase();
    const steps: string[] = [];

    // Step 1: Always create object first
    if (taskLower.includes('rock') || taskLower.includes('batu')) {
        steps.push('CREATE_ROCK');
    } else if (taskLower.includes('tree') || taskLower.includes('pohon')) {
        steps.push('CREATE_TREE');
    } else if (taskLower.includes('terrain') || taskLower.includes('ground')) {
        steps.push('CREATE_TERRAIN');
    } else if (taskLower.includes('room') || taskLower.includes('ruang') || taskLower.includes('kamar') || taskLower.includes('wall') || taskLower.includes('dinding')) {
        steps.push('CREATE_ROOM');
    } else if (taskLower.includes('building') || taskLower.includes('bangunan') || taskLower.includes('office') || taskLower.includes('kantor')) {
        steps.push('CREATE_BUILDING');
    } else if (taskLower.includes('cube') || taskLower.includes('kubus')) {
        steps.push('CREATE_CUBE');
    } else if (taskLower.includes('sphere') || taskLower.includes('bola')) {
        steps.push('CREATE_SPHERE');
    } else if (taskLower.includes('table') || taskLower.includes('meja')) {
        steps.push('CREATE_TABLE');
    } else {
        steps.push('CREATE_OBJECT');
    }

    // Step 2: Texture if mentioned
    if (taskLower.includes('textur') || taskLower.includes('texture') ||
        taskLower.includes('mossy') || taskLower.includes('wood') ||
        taskLower.includes('kayu') || taskLower.includes('batu') ||
        taskLower.includes('stone') || taskLower.includes('metal')) {
        steps.push('APPLY_TEXTURE');
    }

    // Step 3: Material if mentioned
    if (taskLower.includes('material') || taskLower.includes('glass') ||
        taskLower.includes('metal') || taskLower.includes('glow')) {
        steps.push('APPLY_MATERIAL');
    }

    // Step 4: Optimize if mentioned
    if (taskLower.includes('optim') || taskLower.includes('mobile') ||
        taskLower.includes('low-poly') || taskLower.includes('reduce') ||
        taskLower.includes('tris') || taskLower.includes('polygon')) {
        steps.push('OPTIMIZE');
    }

    // Step 5: Bake if mentioned
    if (taskLower.includes('bake') || taskLower.includes('normal map') ||
        taskLower.includes('ao') || taskLower.includes('ambient')) {
        steps.push('BAKE_TEXTURES');
    }

    // Step 6: UNITY_FINALIZE — always inject before export for Unity/game targets
    // This ensures smooth shading, bevel, and poly budget check happen automatically
    if (taskLower.includes('export') || taskLower.includes('unity') ||
        taskLower.includes('unreal') || taskLower.includes('glb') ||
        taskLower.includes('fbx') || taskLower.includes('game')) {
        steps.push('UNITY_FINALIZE');
    }

    // Step 7: Export if mentioned
    if (taskLower.includes('export') || taskLower.includes('unity') ||
        taskLower.includes('unreal') || taskLower.includes('glb') ||
        taskLower.includes('fbx') || taskLower.includes('game')) {
        steps.push('EXPORT');
    }

    return steps;
}

/**
 * Get step instruction
 */
function getStepInstruction(step: string, stepNum: number, totalSteps: number): {
    action: string;
    tool: string;
    instruction: string;
    waitForConfirm: boolean;
} {
    const instructions: Record<string, { action: string; tool: string; instruction: string }> = {
        'CREATE_ROCK': {
            action: 'Create rock',
            tool: 'proc',
            instruction: 'Use proc({type:"ROCK",style:"LOW_POLY"}). Report object name when done.',
        },
        'CREATE_TREE': {
            action: 'Create tree',
            tool: 'proc',
            instruction: 'Use proc({type:"TREE",style:"LOW_POLY"}). Report object name when done.',
        },
        'CREATE_TERRAIN': {
            action: 'Create terrain',
            tool: 'proc',
            instruction: 'Use proc({type:"TERRAIN"}). Report object name when done.',
        },
        'CREATE_ROOM': {
            action: 'Create room with continuous walls',
            tool: 'create_production_asset / run',
            instruction: 'Use create_production_asset({type:"ROOM",name:"Room",params:{width:6,length:5,height:3,wall_thickness:0.15}}) or run({s:"r=P.room(\'Room\', width=6, length=5); result=r.name"}). Generates continuous connected walls.',
        },
        'CREATE_BUILDING': {
            action: 'Create building / floor layout',
            tool: 'create_production_asset / run',
            instruction: 'Use create_production_asset({type:"OFFICE_FLOOR",name:"Office_Floor"}) or run({s:"f=P.office_floor(\'Office_Floor\'); result=f.name"}). Generates continuous connected multi-room walls.',
        },
        'CREATE_CUBE': {
            action: 'Create cube',
            tool: 'prim',
            instruction: 'Use prim({type:"CUBE"}). Report object name when done.',
        },
        'CREATE_SPHERE': {
            action: 'Create sphere',
            tool: 'prim',
            instruction: 'Use prim({type:"SPHERE"}). Report object name when done.',
        },
        'CREATE_TABLE': {
            action: 'Create table',
            tool: 'run',
            instruction: 'Use run({s:"t=L.table([0,0,0],1.5);result=t.name"}). Report object name.',
        },
        'CREATE_OBJECT': {
            action: 'Create object',
            tool: 'prim',
            instruction: 'Use appropriate prim or proc tool. Report object name when done.',
        },
        'APPLY_TEXTURE': {
            action: 'Apply texture',
            tool: 'generate_image + gentex',
            instruction: 'First use generate_image to create texture, then gentex to apply. Report when texture visible.',
        },
        'APPLY_MATERIAL': {
            action: 'Apply material',
            tool: 'mat',
            instruction: 'Use mat({n:"ObjectName",preset:"PRESET"}). Report material applied.',
        },
        'OPTIMIZE': {
            action: 'Optimize mesh',
            tool: 'opt',
            instruction: 'Use opt({object_name:"Name",target_ratio:0.5}). Report before/after face count.',
        },
        'BAKE_TEXTURES': {
            action: 'Bake textures',
            tool: 'bake',
            instruction: 'Use bake({object_name:"Name",bake_types:["NORMAL","AO"]}). Report saved files.',
        },
        'EXPORT': {
            action: 'Export model',
            tool: 'export',
            instruction: 'Use export({format:"FBX",output_path:"path.fbx"}). Unity FBX uses -Z forward / Y up axis automatically. Report file path and size.',
        },
        'UNITY_FINALIZE': {
            action: 'Unity finalize (smooth + bevel + UV + poly check)',
            tool: 'run',
            // Calls the new unity_finalize Blender command via the bridge
            instruction: 'MANDATORY STEP before export. Run: run({s:"result=str(handle_unity_finalize({}))"}) OR directly send unity_finalize command. ' +
                'This applies: smooth shading to all meshes, bevel (width=0.012, segments=3), auto-UV if missing, ' +
                'and reports poly budget. If any object is HIGH_POLY (>5000 tris), run opt() to reduce first. ' +
                'Report the finalized object list and poly counts.',
        },
    };

    const info = instructions[step] || {
        action: step,
        tool: 'unknown',
        instruction: 'Execute this step.',
    };

    return {
        ...info,
        waitForConfirm: true,
    };
}

/**
 * Handler for pipeline tool
 */
export async function handlePipeline(params: PipelineParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('pipeline', params);

    const { action, task, id } = params;

    if (action === 'start') {
        if (!task) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ ok: 0, e: 'Task required for start' }),
                }],
            };
        }

        // Generate pipeline ID
        const pipelineId = `pipe_${Date.now()}`;
        const steps = analyzeTask(task);

        if (steps.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ ok: 0, e: 'Could not determine steps from task' }),
                }],
            };
        }

        // Store pipeline state
        pipelineState.set(pipelineId, {
            steps,
            currentStep: 0,
            context: { task },
            createdAt: Date.now(),
        });

        // Get first step
        const firstStep = getStepInstruction(steps[0], 1, steps.length);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    id: pipelineId,
                    total: steps.length,
                    step: 1,
                    steps: steps,
                    current: {
                        name: steps[0],
                        action: firstStep.action,
                        tool: firstStep.tool,
                        instruction: firstStep.instruction,
                    },
                    msg: `Pipeline started. Execute step 1/${steps.length}: ${firstStep.action}. After executing, call pipeline({action:"next",id:"${pipelineId}"}) to proceed.`,
                }),
            }],
        };
    }

    if (action === 'next' || action === 'back') {
        const pipelineId = id;
        if (!pipelineId || !pipelineState.has(pipelineId)) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ ok: 0, e: 'Pipeline not found. Start new with action:"start"' }),
                }],
            };
        }

        const state = pipelineState.get(pipelineId)!;

        if (action === 'next') {
            state.currentStep++;
        } else if (action === 'back' && state.currentStep > 0) {
            state.currentStep--;
        }

        // Check if complete
        if (state.currentStep >= state.steps.length) {
            pipelineState.delete(pipelineId);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        ok: 1,
                        complete: true,
                        msg: '🎉 Pipeline complete! All steps finished.',
                    }),
                }],
            };
        }

        const currentStepName = state.steps[state.currentStep];
        const stepInfo = getStepInstruction(currentStepName, state.currentStep + 1, state.steps.length);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    id: pipelineId,
                    step: state.currentStep + 1,
                    total: state.steps.length,
                    current: {
                        name: currentStepName,
                        action: stepInfo.action,
                        tool: stepInfo.tool,
                        instruction: stepInfo.instruction,
                    },
                    msg: `Step ${state.currentStep + 1}/${state.steps.length}: ${stepInfo.action}. Execute and call next.`,
                }),
            }],
        };
    }

    if (action === 'status') {
        const pipelineId = id;
        if (!pipelineId || !pipelineState.has(pipelineId)) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ ok: 1, active: false, msg: 'No active pipeline' }),
                }],
            };
        }

        const state = pipelineState.get(pipelineId)!;
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    active: true,
                    id: pipelineId,
                    step: state.currentStep + 1,
                    total: state.steps.length,
                    steps: state.steps,
                }),
            }],
        };
    }

    if (action === 'cancel') {
        const pipelineId = id;
        if (pipelineId && pipelineState.has(pipelineId)) {
            pipelineState.delete(pipelineId);
        }
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, msg: 'Pipeline cancelled' }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: 'Unknown action' }),
        }],
    };
}
