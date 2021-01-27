let sendBtn = document.querySelector("#send"),
	nick = document.querySelector("#nick"),
	msg = document.querySelector("#msg"),
	lastMessageId = 0,
	url = "http://students.a-level.com.ua:10012",
	logLogin = document.querySelector("#login"),
	logPassword = document.querySelector("#password"),
	regLogin = document.querySelector("#regLogin"),
	regPassword = document.querySelector("#regPassword");

function showMessage(nick, msg, timestamp) {
	let chatDiv = document.querySelector("#chat"),
		newMsg = document.createElement("div"),
		date = new Date (timestamp),
		str = date.toLocaleTimeString() + "     <strong>" + nick + "</strong>" + ": " + msg;
	newMsg.innerHTML = str;
	chatDiv.prepend(newMsg);

}

async function sendMessage(nick, message) {
	let data = {
		func: "addMessage",
		nick: nick,
		message: message
	}
	let a = await fetch(url, {
		method: "POST",
		body: (JSON.stringify(data))
	}).then(response => {
		return response.text();
	}).then(data => {
	    return data;
	  })
	return JSON.parse(a);
}

async function getMessages() {
	let data = {
		func: "getMessages",
		messageId: lastMessageId
	}
	let a = await fetch(url, {
		method: "POST",
		body: (JSON.stringify(data))
	}).then(response => {
		return response.text();
	}).then(data => {
	    return JSON.parse(data);
	}).then(data => {
		// console.log(data);
		if (data.data.length > 0) {
			for (let value of data.data){
				let arr = value;
				showMessage(arr.nick, arr.message, arr.timestamp);
			}
			lastMessageId = data.nextMessageId;
		}
	})
}

async function sendAndCheck() {
	sendMessage(nick.value, msg.value);
	getMessages()
}

sendBtn.addEventListener('click', sendAndCheck)

async function checkLoop() {
	getMessages();
	setInterval(() => {
		getMessages();
	}, 1000)
}
checkLoop();