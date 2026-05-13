let instance: MyClass | null = null;
class MyClass {
  public val: number;
  constructor() {
    if (instance) return instance;
    this.val = Math.random();
    instance = this;
  }
}
console.log(new MyClass().val === new MyClass().val);
