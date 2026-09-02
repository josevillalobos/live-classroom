import assert from "node:assert/strict";
import test from "node:test";

import {
  CLASSROOM_CONFIG,
  LESSON_PLANNER_CONFIG,
} from "@/lib/classroom-config";

test("lesson planning has an independent fal route for its second attempt", () => {
  assert.equal(
    LESSON_PLANNER_CONFIG.targets.length,
    CLASSROOM_CONFIG.maxPlannerAttempts,
  );
  assert.equal(LESSON_PLANNER_CONFIG.targets.length, 2);
  assert.deepEqual(
    LESSON_PLANNER_CONFIG.targets.map((target) => target.endpoint),
    ["openrouter/router", "fal-ai/any-llm"],
  );
});
