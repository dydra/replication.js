

export function DOM_update(testname, result) {

        var ul = document.getElementById("testResults");
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(testname + " : " + result));
        ul.appendChild(li);
    }