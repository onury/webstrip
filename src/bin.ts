#!/usr/bin/env node

// own modules
import { main } from './cli.js';

// set the exit code rather than calling process.exit() so piped output is fully flushed
process.exitCode = await main();
