window.__ModuleLoader__.load({
	id: "dsh-mcp-list",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const e = react.createElement;

		//#region styles
		const css = [
			".mcp-info { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }",
			".mcp-info-head { display: flex; flex-direction: column; gap: 4px; }",
			".mcp-info-top { display: flex; align-items: center; gap: 12px; }",
			".mcp-info-title { margin: 0; font-size: 15px; font-weight: 600; flex: none; }",
			".mcp-actions { margin-left: auto; display: flex; gap: 6px; align-items: center; flex: none; }",
			".mcp-info-sub { font-size: 12px; opacity: 0.65; }",
			".mcp-btn { font-size: 11px; padding: 3px 10px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); background: transparent; cursor: pointer; opacity: 0.85; white-space: nowrap; color: inherit; }",
			".mcp-btn:hover { background: var(--dsw-alias-fill-l1, rgba(0,0,0,0.05)); }",
			".mcp-btn:disabled { opacity: 0.45; cursor: default; }",
			".mcp-note { font-size: 12px; flex: none; }",
			".mcp-server-card { border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 10px; overflow: hidden; background: var(--dsw-specific-menu, transparent); }",
			".mcp-server-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; user-select: none; }",
			".mcp-server-head:hover { background: var(--dsw-alias-fill-l1, rgba(0,0,0,0.04)); }",
			".mcp-chevron { font-size: 10px; opacity: 0.6; transition: transform 0.15s ease; flex: none; }",
			".mcp-server-card.mcp-open .mcp-chevron { transform: rotate(90deg); }",
			".mcp-server-name { font-weight: 600; font-size: 13px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".mcp-badge { font-size: 11px; line-height: 1; padding: 4px 8px; border-radius: 999px; background: var(--dsw-alias-fill-l2, rgba(0,0,0,0.06)); color: inherit; flex: none; }",
			".mcp-badge + .mcp-badge { margin-left: -4px; }",
			".mcp-tools { margin: 0; padding: 0 0 4px; list-style: none; border-top: 1px solid var(--dsw-alias-border-l2, #e3e6ea); }",
			".mcp-tool { display: block; padding: 0; font-size: 12px; }",
			".mcp-tool + .mcp-tool { border-top: 1px dashed var(--dsw-alias-border-l2, #eceef2); }",
			".mcp-tool-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 14px; cursor: pointer; }",
			".mcp-tool-row:hover { background: var(--dsw-alias-fill-l1, rgba(0,0,0,0.03)); }",
			".mcp-tool-name { flex: none; width: 150px; box-sizing: border-box; padding: 1px 8px; border-radius: 5px; background: var(--dsw-alias-fill-l2, rgba(0,0,0,0.06)); font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace); font-size: 11.5px; word-break: break-all; }",
			".mcp-tool-desc { flex: 1; min-width: 0; opacity: 0.78; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }",
			".mcp-tool-count { flex: none; width: 48px; text-align: right; font-size: 11.5px; font-variant-numeric: tabular-nums; opacity: 0.75; }",
			".mcp-tool-full { padding: 2px 14px 10px 174px; font-size: 11.5px; line-height: 1.55; opacity: 0.85; overflow-wrap: anywhere; white-space: pre-wrap; }",
			".mcp-empty { opacity: 0.7; font-size: 13px; }",
			".mcp-error { color: #d92d20; font-size: 13px; }",
		].join("\n");
		const tagId = "dsh-mcp-list/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-mcp-list";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region api
		function getJson(path) {
			return fetch(path, { headers: { accept: "application/json" } }).then(function (res) {
				return res.json();
			});
		}
		function postJson(path) {
			return fetch(path, { method: "POST", headers: { accept: "application/json" } }).then(function (res) {
				return res.json();
			});
		}
		//#endregion

		//#region components
		function ToolItem(props) {
			const tool = props.tool;
			const count = props.count;
			const expanded = props.expanded;
			const onToggle = props.onToggle;
			return e("li", { className: "mcp-tool" },
				e("div", {
					className: "mcp-tool-row",
					onClick: onToggle,
					role: "button",
					"aria-expanded": String(!!expanded),
					title: "Click to view full description",
				},
					e("span", { className: "mcp-tool-name" }, tool.name),
					e("span", { className: "mcp-tool-desc" }, tool.description || "\u00a0"),
					e("span", { className: "mcp-tool-count", title: "calls (recent sessions)" },
						count === undefined ? "…" : String(count))),
				expanded
					? e("div", { className: "mcp-tool-full" }, tool.fullDescription || tool.description || "(no description)")
					: null);
		}

		function McpSettingsPage() {
			const state = react.useState({ loading: true, servers: [], error: null });
			const setState = state[1];
			const cur = state[0];
			const openServersState = react.useState({});
			const openServers = openServersState[0];
			const setOpenServers = openServersState[1];
			const expandedState = react.useState({});
			const expanded = expandedState[0];
			const setExpanded = expandedState[1];
			const countsState = react.useState({ loading: false, counts: null });
			const counts = countsState[0];
			const setCounts = countsState[1];
			const openCfgState = react.useState({ busy: false, ok: "", err: "" });
			const openCfg = openCfgState[0];
			const setOpenCfg = openCfgState[1];

			function loadCounts(refresh) {
				setCounts({ loading: true, counts: counts && counts.counts ? counts.counts : null });
				getJson("/mcp-list/counts" + (refresh ? "?refresh=1" : "")).then(function (result) {
					setCounts({ loading: false, counts: (result && result.counts) || {} });
				}).catch(function () {
					setCounts({ loading: false, counts: {} });
				});
			}

			function openConfig() {
				setOpenCfg({ busy: true, ok: "", err: "" });
				postJson("/mcp-list/open-config").then(function (result) {
					if (result && result.error) {
						setOpenCfg({ busy: false, ok: result.path || "", err: result.error });
					} else {
						setOpenCfg({ busy: false, ok: (result && result.path) || "opened", err: "" });
					}
				}).catch(function (err) {
					setOpenCfg({ busy: false, ok: "", err: String(err) });
				});
			}

			react.useEffect(function () {
				let cancelled = false;
				getJson("/mcp-list/servers").then(function (result) {
					if (cancelled) return;
					const servers = (result && result.servers) || [];
					const initial = {};
					for (const s of servers) initial[s.name] = servers.length <= 3;
					setState({ loading: false, servers: servers, error: null });
					setOpenServers(initial);
				}).catch(function (err) {
					if (cancelled) return;
					setState({ loading: false, servers: [], error: String(err) });
				});
				return function () { cancelled = true };
			}, []);

			react.useEffect(function () { loadCounts(false) }, []);

			if (cur.loading) {
				return e("div", { className: "mcp-info" }, "Loading MCP servers…");
			}
			if (cur.error) {
				return e("div", { className: "mcp-error" }, "Failed to load MCP info: " + cur.error);
			}
			if (cur.servers.length === 0) {
				return e("div", { className: "mcp-info" },
					e("div", { className: "mcp-empty" }, "No MCP servers are currently mounted."));
			}

			const totalTools = cur.servers.reduce(function (sum, s) { return sum + s.toolCount }, 0);
			const cards = cur.servers.map(function (server) {
				const isOpen = !!openServers[server.name];
				function toggle() {
					setOpenServers(Object.assign({}, openServers, { [server.name]: !isOpen }));
				}
				const c = counts.counts;
				let serverCalls = null;
				if (c) {
					serverCalls = 0;
					for (const tool of server.tools) {
						serverCalls += c["mcp__" + server.name + "__" + tool.name] || 0;
					}
				}
				const toolItems = isOpen
					? server.tools.map(function (tool) {
							const key = server.name + "/" + tool.name;
							const fullName = "mcp__" + server.name + "__" + tool.name;
							return e(ToolItem, {
								key: tool.name,
								tool: tool,
								count: c ? (c[fullName] || 0) : undefined,
								expanded: !!expanded[key],
								onToggle: function () {
									setExpanded(Object.assign({}, expanded, { [key]: !expanded[key] }));
								},
							});
						})
					: null;
				return e("div", { key: server.name, className: "mcp-server-card" + (isOpen ? " mcp-open" : "") },
					e("div", { className: "mcp-server-head", onClick: toggle, role: "button", "aria-expanded": String(isOpen) },
						e("span", { className: "mcp-chevron" }, "▶"),
						e("span", { className: "mcp-server-name" }, server.name),
						serverCalls !== null
							? e("span", { className: "mcp-badge", title: "total calls in recent sessions" }, serverCalls + " calls")
							: null,
						e("span", { className: "mcp-badge" }, server.toolCount + " tools")),
					isOpen ? e("ul", { className: "mcp-tools" }, toolItems) : null);
			});

			const note = openCfg.ok ? (openCfg.err ? "✗" : "✓") : (openCfg.err ? "✗" : "");
			const noteTitle = openCfg.err ? (openCfg.err + (openCfg.ok ? " — " + openCfg.ok : "")) : openCfg.ok;

			return e("div", { className: "mcp-info" },
				e("div", { className: "mcp-info-head" },
					e("div", { className: "mcp-info-top" },
						e("h3", { className: "mcp-info-title" }, "MCP Servers"),
						e("span", { className: "mcp-actions" },
							note ? e("span", { className: "mcp-note", title: noteTitle }, note) : null,
							e("button", {
								className: "mcp-btn",
								onClick: openConfig,
								disabled: openCfg.busy,
								title: "Open the MCP patch file (cordis.patch.yml) in your system editor",
							}, openCfg.busy ? "Opening…" : "Open config"),
							e("button", {
								className: "mcp-btn",
								onClick: function () { loadCounts(true) },
								disabled: counts.loading,
							}, counts.loading ? "Counting…" : "Refresh counts"))),
					e("div", { className: "mcp-info-sub" },
						cur.servers.length + " servers · " + totalTools + " tools · counts over recent sessions")),
				cards);
		}
		//#endregion

		/** Required services: the Slot registry that owns the settings panel. */
		const inject = ["slots"];

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === undefined) return;
			slots.inject("settings.section", () => slots.register(
				{ name: "settings.section", id: "mcp-info", label: "MCP", order: 60 },
				() => e(McpSettingsPage),
			));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
