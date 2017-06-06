/**
 * 1.栈是一种高效的数据结构， 因为数据只能在栈顶添加或删除， 所以这样的操作很快
 * 栈是一种特殊的列表， 栈内的元素只能通过列表的一端访问， 这一端称为栈顶。
 * 一摞盘子是现实世界中常见的栈的例子.
 * 栈具有后入先出的特点， 所以任何不在栈顶的元素都无法访问。
 * 为了得到栈底的元素， 必须先拿掉上面的元素。    
 *
 * 属性:
 * top  栈数组的第一个空位置 = 栈顶元素的位置+1 ,top处是空的,它处于栈顶元素之上  (top从0开始,0代表在栈底,及栈是空的)，同时也为了标记哪里可以加入新元素，当向栈内压入元素时， 该变量增大
 * 即:第 栈顶元素的 数组下标是 top - 1
 * empty 栈内是否含有元素,用 length 属性也可以达到同样的目的
 *
 * 方法:
 * push() 元素入栈，
 * pop() 元素出栈,(也可以访问栈顶的元素，但是调用该方法后，栈顶元素被删除)
 * peek() 预览栈顶元素,只返回栈顶元素，不删除它。
 * length() 返回栈内元素的个数(top应该是等于数组的length的,所以用top属性也可)
 * clear() 清除栈内所有元素
 * */
//栈类的构造函数
function Stack() {
    this.dataStore = []; //底层数据结构是数组
    this.top = 0; //top应该是等于数组的length的
    this.push = push;
    this.pop = pop;
    this.peek = peek;
    this.length = length;
    this.clear = clear;
}

/**
 * 2. push()
 * 向栈中压入一个新元素， 需要将其保存在数组中变量 top 所对
 * 应的位置， 然后将 top 值加 1， 让top指向数组中下一个空位置
 * 特别注意 ++ 操作符的位置， 它放在 this.top 的后面， 这样新入栈的元素就被放在
 * top 的当前值对应的位置， 然后再将变量 top 的值加 1， 指向下一个位置
 * */
function push(element) {
    this.dataStore[this.top++] = element;
}

/**
 * 3. pop()
 * pop() 方法恰好与 push() 方法相反——它返回栈顶元素， 同时将变量 top 的值减 1
 * 也可以改造一下,只--this.top,不返回栈顶元素
 * */
function pop() {
    return this.dataStore[--this.top];
}

/**
 * 4. peek()
 * peek() 方法返回数组的第 top-1 个位置的元素， 即栈顶元素
 * */
function peek() {
    return this.dataStore[this.top - 1];
}

function length() {
    return this.top;
}

function clear() {
    this.top = 0;
}

/**
 * 5.测试 Stack 类的实现

var s = new Stack();
s.push("David");
s.push("Raymond");
s.push("Bryan");
console.log("length: " + s.length());
console.log(s.peek());
var popped = s.pop();
console.log("The popped element is: " + popped);
console.log(s.peek());
s.push("Cynthia");
console.log(s.peek());
s.clear();
console.log("length: " + s.length());
console.log(s.peek());
s.push("Clayton");
console.log(s.peek());

     * */