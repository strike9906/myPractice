let url = 'http://shop-roles.asmer.fs.a-level.com.ua/graphql',
    logLogin = document.querySelector("#login"),
    logPassword = document.querySelector("#password"),
    regLogin = document.querySelector("#regLogin"),
    regPassword = document.querySelector("#regPassword"),
    logBtn = document.querySelector("#logBtn"),
    regBtn = document.querySelector("#regBtn");
function createStore(reducer){
    let state = reducer(undefined,{})
    let cbs   = []

    function dispatch(action){
        if (typeof action === 'function'){
            return action(dispatch)
        }
        let newState = reducer(state,action)
        if (state !== newState){
            state = newState
            for (let cb of cbs) cb()
        }
    }
    
    return {
        getState(){
            return state
        },
        dispatch: dispatch,
        subscribe(cb){ 
            cbs.push(cb)
            return () => {
                cbs = cbs.filter(someElement => someElement !== cb)
            }
        }
    }
}

const gql = (url= url, query='', variables={}) =>
    fetch(url, {
        method: 'POST',
        headers:{
             'Accept': 'application/json',
              'Content-Type': 'application/json'            
            },
        body: JSON.stringify({query, variables})
    }).then(res => res.json())

function loginQuery(login, password) {
    return gql(url, 
    `query log($login:String, $password:String){
       login(login:$login, password:$password)
    }`, 
    {login: login, password: password})
}

function registerQuery(login, password) {
    return gql(url, 
    `mutation reg($login:String, $password:String){
       UserUpsert(user: {login:$login, password:$password}){
           _id, login
       }
    }`, 
    {login: login, password: password})
}

logBtn.addEventListener('click', () => {
    loginQuery(logLogin.value, logPassword.value).then(data => console.log(data))
})

regBtn.addEventListener('click', ()=> {
    registerQuery(regLogin.value, regPassword.value).then(data => console.log(data))
})


const store = createStore((state={}, 
                           {type, status, payload, error, name}) =>
    (type === 'PROMISE') ? {...state, [name]: {status, payload, error}} : state) //и этот name должен как-то учитываться в структуре хранилища


//console.log(store.getState())

//store.subscribe(() => console.log(store.getState()))

const actionPromise = (name, p) => { //прикрутить имя промиса строковое 

    const actionPending = () => ({type : 'PROMISE', status: 'PENDING', name}) //имя должно попадать в объект action
    const actionResolved = payload => ({type : 'PROMISE',  //поэтому имя параметр или имя name берется из замыкания
                                        status: 'RESOLVED', 
                                        payload, name})
    const actionRejected = error => ({type : 'PROMISE', 
                                      status: 'REJECTED', 
                                      error, name})
    return async dispatch => {
        try {
            dispatch(actionPending())
            let result = await p
            dispatch(actionResolved(result))
            return result;
        }
        catch(e){
            dispatch(actionRejected(e))
        }
    }
}

const actionDefferredPromise = (ms, getPromise) =>
    async dispatch => {
        await dispatch(actionPromise('delay', delay(ms))) //REGISTER
        await dispatch(actionPromise('defferred', getPromise())) //LOGIN
    }

const delay = ms => new Promise(ok => setTimeout(() => ok(ms), ms))
store.dispatch(actionDefferredPromise(2000, () =>
            fetch('https://api.exchangeratesapi.io/latest')
                    .then(res => res.json())))


// store.dispatch(actionPromise('categories', gql(....всякие настройки))


const actionLogin = (login, password) => 
    actionPromise('login', loginQuery(login, password))


const actionRegister = (login, password) =>
    async dispatch => {
        await dispatch('register', actionPromise(registerQuery(login, password))) //REGISTER
        await dispatch(actionLogin(login, password)) //LOGIN
    }



// const store = createStore((state={counter: 0}, action) => {
//     if (action.type === 'INC'){
//         return {counter: state.counter +1}
//     }
//     if (action.type === 'DEC'){
//         return {counter: state.counter -1}
//     }
//     if (action.type === 'RESET'){
//         return {counter: 0}
//     }
//     return state;
// })

// function btn(parent=document.body){
//     let button = document.createElement('button')
//     button.onclick = () => store.dispatch({type: 'INC'})
//     const cb = () => button.innerText = store.getState().counter 
//     cb()
//     store.subscribe(cb)
//     parent.append(button)
// }


// [..."0123456789"].forEach(() => btn())

// function bigTablo(parent=document.body){
//     let h1 = document.createElement('h1')
//     h1.style.fontSize = '5em';
//     h1.onclick = () => store.dispatch({type: 'RESET'})

//     const cb = () => h1.innerText = store.getState().counter 
//     cb()
//     store.subscribe(cb)
//     parent.append(h1)
// }

// [..."01234"].forEach(() => bigTablo())



