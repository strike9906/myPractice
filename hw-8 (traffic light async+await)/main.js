let green = document.querySelector("#green"),
	yellow = document.querySelector("#yellow"),
	red = document.querySelector("#red"),
	btn = document.querySelector("#btn"),
	green2 = document.querySelector("#green2"),
	red2 = document.querySelector("#red2");
red2.style.background = "red";
let seconds = 1000,
	greenTime = 3 * seconds,
	yellowTime = 1 * seconds,
	redTime = 3 * seconds;

const delay = ms => new Promise(ok => setTimeout(() => ok(ms), ms))

function domEventPromise() {
    return new Promise(function (resolve, reject) {
        function removeListener(event) {
            btn.removeEventListener('click', removeListener);
            btn.disabled = true;
            //awaitButton();
            resolve(event);
        }
        btn.addEventListener('click', removeListener);
    });
}

domEventPromise(btn, 'click').then(e => pedestrianTrafficLight());

async function trafficLight(){
    while (true){
    	green.style.background = "green";
    	await delay(greenTime);
    	green.style.background = "white";
    	yellow.style.background = "yellow"
    	await delay(yellowTime)
    	yellow.style.background = "white"
    	red.style.background = "red"
    	await delay(redTime)
    	red.style.background = "white"

    }
}
async function pedestrianTrafficLight(){
	red2.style.background = "white"
    green2.style.background = "green";
    await delay(greenTime);
    green2.style.background = "white";
    red2.style.background = "red"
}
trafficLight();