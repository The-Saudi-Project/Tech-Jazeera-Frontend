/**
 * Client-side approval-role/workflow schemas — instant feedback; the
 * server's Zod layer is the real gatekeeper (same split as everywhere else).
 */
import { z } from 'zod';
import { APPROVAL_REQUEST_TYPES } from '../../lib/constants.js';

export const approvalRoleFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.').max(60),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  members: z.array(z.string()),
  isActive: z.boolean(),
});

export const emptyApprovalRoleForm = { name: '', description: '', members: [], isActive: true };

export function approvalRoleToForm(role) {
  return {
    name: role.name,
    description: role.description ?? '',
    members: (role.members ?? []).map((m) => m._id ?? m),
    isActive: role.isActive,
  };
}

const workflowStepFormSchema = z.object({
  label: z.string().trim().max(60).optional().or(z.literal('')),
  roles: z.array(z.string()).min(1, 'Each step needs at least one role.'),
});

export const approvalWorkflowFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.').max(60),
  steps: z.array(workflowStepFormSchema).min(1, 'Add at least one step.'),
  appliesTo: z.array(z.enum(APPROVAL_REQUEST_TYPES)),
  isActive: z.boolean(),
});

export const emptyApprovalWorkflowForm = {
  name: '',
  steps: [{ label: '', roles: [] }],
  appliesTo: [],
  isActive: true,
};

export function approvalWorkflowToForm(workflow) {
  return {
    name: workflow.name,
    steps: (workflow.steps ?? []).map((s) => ({
      label: s.label ?? '',
      roles: (s.roles ?? []).map((r) => r._id ?? r),
    })),
    appliesTo: workflow.appliesTo ?? [],
    isActive: workflow.isActive,
  };
}
