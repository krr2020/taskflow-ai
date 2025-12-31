import fs from "node:fs";
import path from "node:path";
import { TaskflowConfig, TaskflowConfigSchema } from "./schemas/config.js";

export class ConfigLoader {
    private configPath: string;

    constructor(cwd: string = process.cwd()) {
        this.configPath = path.join(cwd, "taskflow.config.json");
    }

    public load(): TaskflowConfig {
        if (!fs.existsSync(this.configPath)) {
            throw new Error(`Configuration file not found at: ${this.configPath}`);
        }

        try {
            const raw = fs.readFileSync(this.configPath, "utf-8");
            const json = JSON.parse(raw);
            return TaskflowConfigSchema.parse(json);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to load config: ${error.message}`);
            }
            throw error;
        }
    }

    public findConfigRoot(startDir: string): string | null {
        let current = startDir;
        while (current !== path.parse(current).root) {
            if (fs.existsSync(path.join(current, "taskflow.config.json"))) {
                return current;
            }
            current = path.dirname(current);
        }
        return null;
    }
}
