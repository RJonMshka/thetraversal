#!/usr/bin/env node
// Watch build + preview server for the target in the current directory.
import { register } from "tsx/esm/api";

register();
await import("../src/dev.ts");
