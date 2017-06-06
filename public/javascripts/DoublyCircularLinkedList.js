function DoublyCircularLinkedList() {
    var Node = function(element) {
        this.element = element;
        this.next = null;
        this.previous = null;
    }

    var length = 0,
        head = null;

    this.append = function(element) {
        var node = new Node(element),
            last;
        if (!head) { // 生成头结点并next指向自己
            head = node;
            node.next = head;
            node.previous = head;
        } else { // 找到尾巴然后插入
            last = head.previous;
            last.next = node;
            node.previous = last;
            node.next = head;
            head.previous = node;
        };
        length++;
        return true;
    };

    this.insert = function(position, element) {
        var current = this.get(position);
        var currentNext = current.next;
        if (current) {
            var node = new Node(element);
            if (position === 0) {
                head = node;
            }
            current.next = node;
            node.previous = current;
            node.next = currentNext;
            currentNext.previous = node;
            length++;
            return true;
        } else {
            return false;
        }
    };

    this.get = function(index) {
        if (index > -1 && index < length) {
            var current = head,
                i = 0,
                len = length;
            if (index < Math.ceil(length / 2)) { // 使用next查找
                while (i++ < index) {
                    current = current.next;
                }
            } else { // 使用previous查找
                while (len-- > index) {
                    current = current.previous;
                }
            }
            return current;
        }
        return null;
    };

    this.listClip = function(center, offset) {
        var centerNode = forward = backward = this.get(center),
            m = n = offset,
            leftClip = [],
            rightClip = [],
            clip = [];
        if (!centerNode) {
            return null;
        }
        // 清空全部显示标记
        this.deleteNodeProp("status");
        centerNode.status = 1;
        while (m-- > 0) {
            forward = forward.next;
            rightClip.push((forward.status && forward.status === 1) ? null : forward.element);
            forward.status = 1;
        }
        while (n-- > 0) {
            backward = backward.previous;
            leftClip.push((backward.status && backward.status === 1) ? null : backward.element);
            backward.status = 1;
        }
        clip = clip.concat(leftClip.reverse());
        clip.push(centerNode.element);
        clip = clip.concat(rightClip);
        return clip;
    };

    this.removeAt = function(position) {
        var current = this.get(position);
        var currentNext = current.next;
        var currentPrevious = current.previous;
        if (current) {
            if (position === 0) {
                head = currentNext;
            }
            currentPrevious.next = currentNext;
            currentNext.previous = currentPrevious;
            length--;
            return current.element;
        } else {
            return null;
        }
    };

    this.deleteNodeProp = function(prop) {
        var current = head,
            i = 0;
        delete(head[prop]);
        while (i++ < length) {
            current = current.next;
            delete(current[prop]);
        }
        return true;
    }

    this.clear = function() { // 清空
        head = null;
        length = 0;
    };

    this.isEmpty = function() {
        return length === 0;
    };

    this.size = function() {
        return length;
    };

    this.toString = function() {
        var current = head,
            string = '',
            indexCheck = 0;
        while (current && indexCheck < length) {
            string += current.element;
            current = current.next;
            indexCheck++;
        }
        return string;
    };

    this.toStringReverse = function() {
        var current = head.previous,
            string = '',
            len = length;
        while (len-- > 0) {
            string += current.element;
            current = current.previous;
        }
        return string;
    };

}

// var clist = new DoublyCircularLinkedList();
// clist.append("a1");
// clist.append("a2");
// clist.append("a3");
// clist.append("a4");
// clist.append("a5");
// clist.append("a6");
// clist.append("a7");
// clist.append("a8");
// clist.append("a9");
// clist.append("a10");
// console.log(clist.toString());
// console.log(clist.toStringReverse());
// clist.listClip(3, 5);