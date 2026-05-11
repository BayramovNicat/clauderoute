import {
	chmod,
	copyFile,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import packageJson from "../package.json" with { type: "json" };

const command = process.argv[2] ?? "binary";
const appName = packageJson.displayName ?? packageJson.name;
const appVersion = process.env.APP_VERSION ?? packageJson.version;
const buildNumber = process.env.BUILD_NUMBER ?? "1";
const binaryName = packageJson.name;
const binaryPath = join("dist", binaryName);

if (command === "frontend") {
	await buildFrontend();
} else if (command === "binary") {
	await buildFrontend();
	buildBinary(binaryPath);
} else if (command === "mac") {
	if (process.platform !== "darwin")
		throw new Error("macOS app build requires macOS.");
	await buildFrontend();
	buildBinary(binaryPath);
	await buildMacApp();
} else {
	throw new Error(`Unknown build command: ${command}`);
}

async function buildFrontend() {
	const outDir =
		process.env.STARTER_FRONTEND_OUT_DIR ?? join("dist", "frontend");
	await mkdir(outDir, { recursive: true });
	spawnRequired([
		"bun",
		"build",
		"./src/frontend/app.ts",
		"--outfile",
		join(outDir, "app.js"),
		"--format",
		"esm",
		"--minify",
	]);
	spawnRequired([
		"bunx",
		"@tailwindcss/cli",
		"-i",
		"./src/frontend/styles.css",
		"-o",
		join(outDir, "styles.css"),
		"--minify",
	]);
	await writeFile(
		join(outDir, "index.html"),
		minifyHtml(await readFile(join("src", "frontend", "index.html"), "utf8")),
	);
}

function minifyHtml(html: string) {
	return html
		.replaceAll(/>\s+</g, "><")
		.replaceAll(/\s{2,}/g, " ")
		.trim();
}

function buildBinary(outfile: string) {
	spawnRequired([
		"bun",
		"build",
		"--compile",
		"./src/index.ts",
		"--outfile",
		outfile,
	]);
}

function spawnRequired(command: string[]) {
	const result = Bun.spawnSync(command);
	if (result.success) return;

	const stderr = new TextDecoder().decode(result.stderr).trim();
	const tool = command[0];
	if (result.exitCode === 127 || stderr.includes("ENOENT")) {
		const installHint = tool?.startsWith("bun")
			? "Install Bun from https://bun.sh, then retry."
			: "Install it or add it to PATH, then retry.";
		throw new Error(`Required tool not found: ${tool}. ${installHint}`);
	}

	throw new Error(stderr || `${tool} failed with exit code ${result.exitCode}`);
}

async function buildMacApp() {
	const appRoot = join("dist", `${appName}.app`);
	const contents = join(appRoot, "Contents");
	const macos = join(contents, "MacOS");
	const resources = join(contents, "Resources");
	const appBinary = join(macos, binaryName);
	const launcher = join(macos, appName);
	const sourceIcon = join("assets", "icon.icns");
	const appIcon = join(resources, "icon.icns");

	await rm(appRoot, { recursive: true, force: true });
	await mkdir(macos, { recursive: true });
	await mkdir(resources, { recursive: true });
	await copyFile(binaryPath, appBinary);
	await writeFile(join(contents, "Info.plist"), await plist());
	await buildLauncher(launcher);
	await chmod(appBinary, 0o755);
	await chmod(launcher, 0o755);

	try {
		await copyFile(sourceIcon, appIcon);
	} catch {
		console.warn("No assets/icon.icns found. App builds without custom icon.");
	}

	console.log(`Created ${appRoot}`);
}

async function buildLauncher(outfile: string) {
	const tempDir = await mkdtemp(join(tmpdir(), "starter-launcher-"));
	const source = join(tempDir, "mac-launcher.swift");
	const template = await readFile(
		join("scripts", "mac-launcher.swift"),
		"utf8",
	);
	await writeFile(
		source,
		template
			.replaceAll("{{APP_NAME}}", swiftString(appName))
			.replaceAll("{{BINARY_NAME}}", swiftString(binaryName)),
	);

	try {
		spawnRequired([
			"xcrun",
			"swiftc",
			source,
			"-o",
			outfile,
			"-framework",
			"Cocoa",
			"-framework",
			"WebKit",
		]);
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

async function plist() {
	const template = await readFile(join("scripts", "Info.plist.xml"), "utf8");
	return template
		.replaceAll("{{APP_NAME}}", appName)
		.replaceAll("{{APP_VERSION}}", appVersion)
		.replaceAll("{{BUILD_NUMBER}}", buildNumber);
}

function swiftString(value: string) {
	return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
