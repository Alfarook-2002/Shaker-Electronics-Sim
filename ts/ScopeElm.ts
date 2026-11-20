/*
    Copyright (C) Paul Falstad and Iain Sharp

    This file is part of CircuitJS1.

    CircuitJS1 is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.

    CircuitJS1 is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with CircuitJS1.  If not, see <http://www.gnu.org/licenses/>.
*/

import { CircuitElm } from "./CircuitElm";
import { Scope } from "./Scope";
import { Graphics } from "./Graphics";
import { Rectangle } from "./Rectangle";
import { StringTokenizer } from "./StringTokenizer";
import { CircuitXMLDeserializer } from "./CircuitXMLDeserializer";

export class ScopeElm extends CircuitElm {

    private static dockIcon: HTMLImageElement | null = null;

    declare elmScope: Scope;

    constructor(xx: number, yy: number);
    constructor(xa: number, ya: number, xb: number, yb: number, f: number, st: StringTokenizer);
    constructor(xxOrXa: number, yyOrYa: number, xb?: number, yb?: number, f?: number, st?: StringTokenizer) {
        if (xb === undefined) {
            super(xxOrXa, yyOrYa);
            this.noDiagonal = false;
            this.x2 = this.x + 128;
            this.y2 = this.y + 64;
            this.elmScope = new Scope(CircuitElm.app, CircuitElm.sim);
            this.setPoints();
        } else {
            super(xxOrXa, yyOrYa, xb, yb!, f!);
            this.noDiagonal = false;
            const sStr = st!.nextToken();
            const sst = new StringTokenizer(sStr, "_");
            this.elmScope = new Scope(CircuitElm.app, CircuitElm.sim);
            this.elmScope.undump(sst);
            this.setPoints();
            this.elmScope.resetGraph();
        }
    }

    setScopeElm(e: CircuitElm): void {
        this.elmScope.setElm(e);
        this.elmScope.resetGraph();
    }

    setScopeRect(): void {
        const i1 = CircuitElm.app.mouse.transformX(Math.min(this.x, this.x2));
        const i2 = CircuitElm.app.mouse.transformX(Math.max(this.x, this.x2));
        const j1 = CircuitElm.app.mouse.transformY(Math.min(this.y, this.y2));
        const j2 = CircuitElm.app.mouse.transformY(Math.max(this.y, this.y2));
        const r = new Rectangle(i1, j1, i2 - i1, j2 - j1);
        if (!r.equals(this.elmScope.rect))
            this.elmScope.setRect(r);
    }

    setPoints(): void {
        super.setPoints();
        this.setScopeRect();
    }

    setElmScope(s: Scope): void {
        this.elmScope = s;
    }

    stepScope(): void {
        this.elmScope.timeStep();
    }

    reset(): void {
        super.reset();
        this.elmScope.resetGraphFull(true);
    }

    clearElmScope(): void {
        this.elmScope = null!;
    }

    override isCloseButtonAt(x: number, y: number): boolean {
        const rect = this.getCloseButtonRect();
        return rect !== null && rect.contains(x, y);
    }

    override isDockButtonAt(x: number, y: number): boolean {
        const rect = this.getDockButtonRect();
        return rect !== null && rect.contains(x, y);
    }

    private getCloseButtonRect(): Rectangle | null {
        const scopeRect = this.elmScope?.rect;
        if (scopeRect == null || scopeRect.width < 24 || scopeRect.height < 24)
            return null;
        return new Rectangle(scopeRect.x + scopeRect.width - 24, scopeRect.y + 4, 20, 20);
    }

    private getDockButtonRect(): Rectangle | null {
        const scopeRect = this.elmScope?.rect;
        if (scopeRect == null || scopeRect.width < 24 || scopeRect.height < 48)
            return null;
        return new Rectangle(scopeRect.x + scopeRect.width - 24, scopeRect.y + scopeRect.height - 24, 20, 20);
    }

    private getButtonAlpha(): number {
        return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--alpha_button"));
    }

    private drawCloseButton(g: Graphics): void {
        const rect = this.getCloseButtonRect();
        if (rect === null)
            return;

        const ctx = g.context;
        ctx.save();
        ctx.globalAlpha = this.getButtonAlpha();
        ctx.fillStyle = "rgba(35, 35, 35, 0.82)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "#e3e3e3";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rect.x + 6, rect.y + 6);
        ctx.lineTo(rect.x + 14, rect.y + 14);
        ctx.moveTo(rect.x + 14, rect.y + 6);
        ctx.lineTo(rect.x + 6, rect.y + 14);
        ctx.stroke();
        ctx.restore();
    }

    private drawDockButton(g: Graphics): void {
        const rect = this.getDockButtonRect();
        if (rect === null)
            return;

        const ctx = g.context;
        ctx.save();
        ctx.globalAlpha = this.getButtonAlpha();
        ctx.fillStyle = "rgba(35, 35, 35, 0.82)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        if (ScopeElm.dockIcon === null) {
            const icon = document.createElement("img");
            icon.alt = "";
            icon.draggable = false;
            icon.addEventListener("load", () => CircuitElm.app.repaint());
            icon.addEventListener("error", () => console.error(`Could not load dock-scope icon: ${icon.src}`));
            icon.src = "./mobile/icons/dock.svg";
            ScopeElm.dockIcon = icon;
        }
        if (ScopeElm.dockIcon.complete && ScopeElm.dockIcon.naturalWidth > 0)
            ctx.drawImage(ScopeElm.dockIcon, rect.x, rect.y, rect.width, rect.height);
        ctx.restore();
    }

    canViewInScope(): boolean { return false; }

    getDumpType(): number { return 403; }

    dumpXml(doc: Document, elem: Element): void {
        super.dumpXml(doc, elem);
        this.elmScope.dumpXml(doc, elem);
    }

    undumpXml(xml: CircuitXMLDeserializer): void {
        super.undumpXml(xml);
        for (const child of xml.getChildElements()) {
            if (child.tagName === "o") {
                xml.parseChildElement(child);
                this.elmScope.undumpXml(xml);
                break;
            }
        }
        this.elmScope.resetGraph();
    }

    draw(g: Graphics): void {
        g.setColor(this.needsHighlight() ? CircuitElm.selectColor : CircuitElm.whiteColor);
        g.context.save();
        // setTransform() doesn't work in version of canvas2svg we are using
        g.context.scale(1 / CircuitElm.app.transform[0], 1 / CircuitElm.app.transform[3]);
        g.context.translate(-CircuitElm.app.transform[4], -CircuitElm.app.transform[5]);

        this.setScopeRect();
        this.elmScope.position = -1;
        this.elmScope.draw(g);
        if (!this.elmScope.exporting) {
            this.drawCloseButton(g);
            this.drawDockButton(g);
        }
        g.context.restore();
        this.setBbox(this.point1, this.point2, 0);
        this.drawPosts(g);
    }

    getPostCount(): number { return 0; }
    getNumHandles(): number { return 2; }
    isScopeElm(): boolean { return true; }

    selectScope(mx: number, my: number): void { this.elmScope.selectScope(mx, my); }
}
