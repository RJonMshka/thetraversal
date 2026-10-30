#!/usr/bin/env node
// Runs the conformance suite against the target in the current directory.
import { register } from "tsx/esm/api";

register();
await import("../src/conformance/run.ts");
