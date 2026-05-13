export class Observable {
	protected listeners: (() => void)[] = [];

	subscribe(listener: () => void) {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	protected notify() {
		for (const l of this.listeners) l();
	}
}
