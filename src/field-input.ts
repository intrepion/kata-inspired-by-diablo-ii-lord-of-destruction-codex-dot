import type { Point } from "./projection";

/** Transient pointer intent. Strike never changes the selected foe, including a spent selection. */
export class FieldInput {
  target: Point | undefined;
  heldAttack = false;
  private selected: number | undefined;
  get enemyTarget(): number | undefined {
    return this.selected;
  }
  chooseFoe(id: number): void {
    this.selected = id;
    this.target = undefined;
  }
  moveTo(point?: Point): void {
    this.selected = undefined;
    this.target = point;
  }
  beginStrike(): void {
    this.target = undefined;
    this.heldAttack = true;
  }
  releaseStrike(): void {
    this.heldAttack = false;
  }
  clear(): void {
    this.target = undefined;
    this.selected = undefined;
    this.heldAttack = false;
  }
}
