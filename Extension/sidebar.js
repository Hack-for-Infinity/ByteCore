const input=document.getElementById("question")
const messages=document.getElementById("messages")

input.addEventListener("keydown",async(e)=>{

if(e.key==="Enter"){

const question=input.value

addMessage("You",question)

input.value=""

const text=await getPageText()

const res=await fetch("http://localhost:3000/api/reader/chat",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
question,
text
})

})

const data=await res.json()

addMessage("AI",data.answer)

}

})


function addMessage(sender,text){

const div=document.createElement("div")

div.innerHTML="<b>"+sender+":</b> "+text

div.style.marginBottom="10px"

messages.appendChild(div)

messages.scrollTop=messages.scrollHeight

}


async function getPageText(){

return new Promise(resolve=>{

chrome.tabs.query({active:true,currentWindow:true},function(tabs){

chrome.tabs.sendMessage(
tabs[0].id,
{action:"GET_PAGE_TEXT"},
resolve
)

})

})

}