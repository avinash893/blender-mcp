/**
 * Blender MCP Server - Poly Haven Integration Tools
 * Provides ph_search, ph_import, ph_texture, ph_hdri, ph_replace, ph_inspect, ph_status
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

// ─── Schemas ────────────────────────────────────────────────────────────────

export const phSearchSchema = {
    query: z.string().default('').describe('Search keywords (name, category, tag)'),
    asset_type: z.enum(['all', 'hdri', 'texture', 'model']).default('all').describe('Asset type filter'),
    max_results: z.number().int().min(1).max(100).default(20).describe('Max results to return'),
};

export const phImportSchema = {
    slug: z.string().describe('Poly Haven asset slug (e.g. "office_chair_01", "brick_wall")'),
    location: z.array(z.number()).length(3).default([0, 0, 0]).describe('[X,Y,Z] location in meters'),
    rotation: z.array(z.number()).length(3).default([0, 0, 0]).describe('[X,Y,Z] rotation in radians'),
    scale: z.number().positive().default(1.0).describe('Uniform scale multiplier'),
    resolution: z.enum(['1k', '2k', '4k', '8k']).default('1k').describe('Asset resolution'),
};

export const phTextureSchema = {
    slug: z.string().describe('Poly Haven texture/material slug (e.g. "concrete_floor_02", "wood_planks_01")'),
    objects: z.array(z.string()).optional().describe('Object names to apply texture to (empty = none)'),
    resolution: z.enum(['1k', '2k', '4k', '8k']).default('2k').describe('Texture resolution'),
};

export const phHdriSchema = {
    slug: z.string().describe('Poly Haven HDRI slug (e.g. "industrial_sunset_01", "abandoned_hopper")'),
    rotation_z: z.number().default(0.0).describe('HDRI rotation in degrees (0-360)'),
    strength: z.number().positive().default(1.0).describe('HDRI strength/intensity'),
    resolution: z.enum(['1k', '2k', '4k', '8k']).default('1k').describe('HDRI resolution'),
};

export const phReplaceSchema = {
    old_slug: z.string().describe('Slug of the existing asset to replace'),
    new_slug: z.string().describe('Slug of the new asset to replace it with'),
    resolution: z.enum(['1k', '2k', '4k', '8k']).default('1k').describe('Resolution for new asset'),
};

export const phInspectSchema = {
    slug: z.string().describe('Asset slug or collection name to inspect in the current scene'),
};

export const phStatusSchema = {};

// ─── Type parameter mapping ──────────────────────────────────────────────────

const TYPE_MAP: Record<string, number | null> = {
    'all': null,
    'hdri': 0,
    'texture': 1,
    'model': 2,
};

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function handlePhSearch(params: {
    query: string;
    asset_type: 'all' | 'hdri' | 'texture' | 'model';
    max_results: number;
}): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    log.debug('ph_search', params);

    const asset_type_code = TYPE_MAP[params.asset_type];

    const response = await blenderBridge.send('ph_search', {
        query: params.query,
        asset_type: asset_type_code,
        max_results: params.max_results,
    });

    if (response.success && response.data) {
        const d = response.data as {
            query: string;
            count: number;
            results: Array<{
                slug: string;
                name: string;
                type_name: string;
                categories: string[];
                tags: string[];
                downloaded: boolean;
            }>;
        };
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    query: d.query,
                    count: d.count,
                    results: d.results,
                }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: response.error }),
        }],
    };
}

export async function handlePhImport(params: {
    slug: string;
    location: number[];
    rotation: number[];
    scale: number;
    resolution: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    log.debug('ph_import', params);

    const response = await blenderBridge.send('ph_import', {
        slug: params.slug,
        location: params.location,
        rotation: params.rotation,
        scale: params.scale,
        resolution: params.resolution,
    });

    if (response.success && response.data) {
        const d = response.data as {
            status: string;
            slug: string;
            collection?: string;
            new_objects?: string[];
            new_collections?: string[];
            scale_check?: { status: string; max_dimension?: number; warning?: string };
        };
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    status: d.status,
                    slug: d.slug,
                    collection: d.collection,
                    objects: d.new_objects?.length ?? 0,
                    scale: d.scale_check,
                }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: response.error }),
        }],
    };
}

export async function handlePhTexture(params: {
    slug: string;
    objects?: string[];
    resolution: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    log.debug('ph_texture', params);

    const response = await blenderBridge.send('ph_texture', {
        slug: params.slug,
        objects: params.objects,
        resolution: params.resolution,
    });

    if (response.success && response.data) {
        const d = response.data as {
            status: string;
            slug: string;
            material?: string;
            assigned_to?: string[];
            material_validation?: { pbr_score: string; has_normal: boolean };
        };
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    status: d.status,
                    slug: d.slug,
                    material: d.material,
                    assigned_to: d.assigned_to,
                    pbr: d.material_validation,
                }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: response.error }),
        }],
    };
}

export async function handlePhHdri(params: {
    slug: string;
    rotation_z: number;
    strength: number;
    resolution: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    log.debug('ph_hdri', params);

    const response = await blenderBridge.send('ph_hdri', {
        slug: params.slug,
        rotation_z: params.rotation_z,
        strength: params.strength,
        resolution: params.resolution,
    });

    if (response.success && response.data) {
        const d = response.data as {
            status: string;
            slug: string;
            world?: string;
            strength: number;
            rotation_z: number;
        };
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    status: d.status,
                    slug: d.slug,
                    world: d.world,
                    strength: d.strength,
                }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: response.error }),
        }],
    };
}

export async function handlePhReplace(params: {
    old_slug: string;
    new_slug: string;
    resolution: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    log.debug('ph_replace', params);

    const response = await blenderBridge.send('ph_replace', {
        old_slug: params.old_slug,
        new_slug: params.new_slug,
        resolution: params.resolution,
    });

    if (response.success && response.data) {
        const d = response.data as {
            status: string;
            old_slug: string;
            new_slug: string;
            location_preserved?: number[];
        };
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    status: d.status,
                    old: d.old_slug,
                    new: d.new_slug,
                    location: d.location_preserved,
                }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: response.error }),
        }],
    };
}

export async function handlePhInspect(params: {
    slug: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    log.debug('ph_inspect', params);

    const response = await blenderBridge.send('ph_inspect', {
        slug: params.slug,
    });

    if (response.success && response.data) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, ...response.data }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: response.error }),
        }],
    };
}

export async function handlePhStatus(): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    log.debug('ph_status', {});

    const response = await blenderBridge.send('ph_status', {});

    if (response.success && response.data) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, ...response.data }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: response.error }),
        }],
    };
}
