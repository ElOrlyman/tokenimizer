import { z } from 'zod';

export const SkillMetaSchema = z.object({
  id:          z.string(),
  name:        z.string(),
  version:     z.string(),
  description: z.string(),
  category:    z.string(),
  priority:    z.enum(['required', 'strongly_recommended', 'optional']),
  tokenImpact: z.object({
    input:  z.number(),  // % change, negative = savings
    output: z.number(),
  }),
  targets:   z.array(z.string()),
  conflicts: z.array(z.string()),
  requires:  z.array(z.string()),
  tags:      z.array(z.string()),
});

export type SkillMeta = z.infer<typeof SkillMetaSchema>;

export const RegistryIndexSchema = z.object({
  version: z.string(),
  skills:  z.array(SkillMetaSchema),
});

export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
