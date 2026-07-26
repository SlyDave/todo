# Hook identity spike

Measured against Cursor on 2026-07-26 by logging raw hook payloads.

## What hooks actually receive

`preToolUse` carries: `conversation_id`, `session_id`, `generation_id`, `model`,
`tool_name`, `tool_input`, `tool_use_id`, `transcript_path`, `workspace_roots`,
`user_email`, `cursor_version`, and `cwd` (Shell only).

`subagentStart` and `subagentStop` additionally carry `subagent_id`,
`subagent_type`, `parent_conversation_id`, `task`, and `is_parallel_worker`.

## The two findings that shape enforcement

**A subagent is distinguishable from the main agent.** When a subagent runs a
tool, `preToolUse.conversation_id` is the subagent's own id, not the main
conversation's. The main agent's `conversation_id` stays equal to the root
session id for the life of the session.

**A subagent's *role* is not recoverable.** `subagentStart` reports
`subagent_type`, but its `conversation_id`, `session_id` and
`parent_conversation_id` are all the *parent's* id, and its `subagent_id` is the
dispatching tool-use id (`toolu_...`). None of those keys reappear in the
`preToolUse` payload the subagent later produces. There is no join column, so a
hook cannot answer "is this write coming from the backend developer or from QA".

## Consequences for the design

Enforcement is therefore split across two mechanisms:

- **Hooks enforce isolation, which needs no role identity.** Any write from a
  non-root conversation to the shared zone is denied. Beyond that, a subagent
  conversation is bound to the first lane it writes into, and later writes from
  that same `conversation_id` must stay in that lane. Two agents can never
  collide even though the hook never learns who they are.
- **The pre-PR gate enforces role-appropriate paths.** Branch names encode the
  role (`backend/issue-12`, `qa/issue-12`), which is reliable metadata, so the
  gate can reject a QA branch that touched production source, or a frontend
  branch that touched backend code.

One operational note: subagents defined in `.cursor/agents/` are not registered
until Cursor reloads the workspace. A freshly cloned template needs a reload
before the roles are dispatchable.
