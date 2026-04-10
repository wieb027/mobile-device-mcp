import { spawn as nodeSpawn, type ChildProcess } from "node:child_process";
import { Readable } from "node:stream";

type StdioMode = "pipe" | "ignore";

type SpawnOptions = {
    stdout?: StdioMode;
    stderr?: StdioMode;
    env?: NodeJS.ProcessEnv;
};

export type ManagedSubprocess = {
    pid: number;
    stdout: ReadableStream<Uint8Array> | null;
    stderr: ReadableStream<Uint8Array> | null;
    exited: Promise<number>;
    readonly exitCode: number | null;
    kill(signal?: number | NodeJS.Signals): void;
};

function toNodeSignal(signal: number | NodeJS.Signals | undefined): NodeJS.Signals | undefined {
    if (signal === undefined) return undefined;
    if (typeof signal !== "number") return signal;
    switch (signal) {
        case 2:
            return "SIGINT";
        case 9:
            return "SIGKILL";
        case 15:
            return "SIGTERM";
        default:
            return undefined;
    }
}

function toWebStream(stream: NodeJS.ReadableStream | null): ReadableStream<Uint8Array> | null {
    if (!stream) return null;
    return Readable.toWeb(stream as Readable) as unknown as ReadableStream<Uint8Array>;
}

function spawnWithNode(cmd: string[], options: SpawnOptions = {}): ManagedSubprocess {
    const stdoutMode = options.stdout ?? "pipe";
    const stderrMode = options.stderr ?? "pipe";

    const child: ChildProcess = nodeSpawn(cmd[0], cmd.slice(1), {
        env: options.env ?? process.env,
        stdio: ["ignore", stdoutMode, stderrMode],
        windowsHide: true,
    });

    const exited = new Promise<number>((resolve) => {
        child.once("close", (code) => {
            resolve(code ?? 1);
        });
    });

    return {
        pid: child.pid ?? -1,
        stdout: toWebStream(child.stdout),
        stderr: toWebStream(child.stderr),
        exited,
        get exitCode() {
            return child.exitCode;
        },
        kill(signal?: number | NodeJS.Signals) {
            child.kill(toNodeSignal(signal));
        },
    };
}

export function spawnProcess(cmd: string[], options: SpawnOptions = {}): ManagedSubprocess {
    const bunRuntime = (globalThis as { Bun?: { spawn: (c: string[], o?: SpawnOptions) => ManagedSubprocess } }).Bun;
    if (bunRuntime?.spawn) {
        return bunRuntime.spawn(cmd, options);
    }
    return spawnWithNode(cmd, options);
}

export async function sleep(ms: number): Promise<void> {
    const bunRuntime = (globalThis as { Bun?: { sleep: (n: number) => Promise<void> } }).Bun;
    if (bunRuntime?.sleep) {
        await bunRuntime.sleep(ms);
        return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
}
