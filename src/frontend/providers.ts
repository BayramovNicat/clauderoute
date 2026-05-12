import { omniRouteLoginReturnToKey } from "./auth";
import { classes } from "./classes";
import type { Connection, CookieDebugInfo, ProviderModel } from "./data";
import { html } from "./dom";

export function connectionCard(
	connection: Connection,
	models: ProviderModel[],
) {
	const isHealthy =
		connection.testStatus === "active" ||
		(connection.isActive && !connection.testStatus);

	return html`
		<article class="${classes.providerCard}">
			<div class="${classes.providerCardHeader}">
				<div>
					<h3 class="${classes.providerName}">${connection.provider}</h3>
					<p class="${classes.providerAccount}">${connection.email ?? connection.name ?? connection.id}</p>
				</div>
				<span class="${classes.statusBadge} ${isHealthy ? classes.statusBadgeActive : classes.statusBadgeWarning}">${connection.testStatus ?? (connection.isActive ? "active" : "inactive")}</span>
			</div>
			${modelsSection(models)}
			${connection.lastError ? errorBox(connection.lastError) : ""}
		</article>
	`;
}

export function authRequiredMessage(
	loginUrl: string,
	cookieInfo: CookieDebugInfo | null,
) {
	const button = html`
		<button type="button" class="${classes.primaryButton}">Open OmniRoute login</button>
	` as HTMLButtonElement;
	button.addEventListener("click", () => {
		sessionStorage.setItem(omniRouteLoginReturnToKey, location.href);
		location.assign(loginUrl);
	});

	return html`
		<div class="${classes.emptyState}">
			<p>OmniRoute still needs authentication.</p>
			<p>${cookieInfo ? `Local app cookies: ${cookieInfo.cookieCount} (${cookieInfo.cookieNames.join(", ") || "none"})` : "Local app cookies: unavailable"}</p>
			${button}
		</div>
	` as HTMLDivElement;
}

export function empty(text: string) {
	return html`<p class="${classes.emptyState}">${text}</p>` as HTMLParagraphElement;
}

function modelsSection(models: ProviderModel[]) {
	const items = models.length
		? models.map((model) =>
				modelPill(
					model.name === model.id ? model.id : `${model.name} (${model.id})`,
				),
			)
		: [empty("No models returned for provider.")];

	return html`
		<section class="${classes.modelsBox}">
			<h4 class="${classes.modelsTitle}">models (${models.length})</h4>
			<div class="${classes.modelList}">${items}</div>
		</section>
	`;
}

function modelPill(text: string) {
	return html`<span class="${classes.modelPill}">${text}</span>` as HTMLSpanElement;
}

function errorBox(text: string) {
	return html`<p class="${classes.errorBox}">${text}</p>` as HTMLParagraphElement;
}
