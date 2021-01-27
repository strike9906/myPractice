import React, {useState, Component, useEffect} from 'react';
import logo from './logo.svg';
import './App.css';
import {Provider, connect}   from 'react-redux';
import thunk from 'redux-thunk';
import {createStore, combineReducers, applyMiddleware} from 'redux';
import jwt_decode from "jwt-decode";


let url = 'http://shop-roles.asmer.fs.a-level.com.ua/graphql',
    logLogin = document.querySelector("#login"),
    logPassword = document.querySelector("#password"),
    regLogin = document.querySelector("#regLogin"),
    regPassword = document.querySelector("#regPassword"),
    logBtn = document.querySelector("#logBtn"),
    regBtn = document.querySelector("#regBtn");

// const store = createStore((state={}, 
//     {type, status, payload, error, name}) =>
//     (type === 'PROMISE') ? {...state, [name]: {status, payload, error}} : state, 
//     applyMiddleware(thunk)) //вторым параметром идет миддлварь

const reducers = {
    promise(state={}, action){
        // if (['LOGOUT', 'LOGIN'].includes(action.type)) return {}
        if (action.type === 'PROMISE'){
            const { name="default", status, payload, error} = action
            if (status){
                return {
                    ...state, [name]: {status, payload: (status === 'PENDING' && state[name] && state[name].payload) || payload, error}
                }
            }
        }
        return state;
    },
    auth(state, action){ 
        if (state === undefined){
            //добавить в action token из localStorage, и проимитировать LOGIN (action.type = 'LOGIN')
            const token = localStorage.getItem('token')
            console.log(token)
            if (token !== 'undefined' && token !== 'null') {
                action.type = 'LOGIN'
                console.log('true')
                action.payload = token;
            } else return {}
        }

        if (action.type === 'LOGIN'){
            console.log('ЛОГИН')
            console.log(action.payload)
            if (action.payload) return {token: action.payload, payload: jwt_decode(action.payload)}
        }

        if (action.type === 'LOGOUT'){
            console.log('ЛОГАУТ')
            localStorage.setItem('token', undefined)
            return {}
        }
        return state
    }
}
let store = createStore(combineReducers(reducers), applyMiddleware(thunk))

const gql = (url = url, query='', variables={}) =>
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

// store.dispatch(actionPromise('LOGIN', loginQuery(undefined, undefined)))
const delay = ms => new Promise(ok => setTimeout(() => ok(ms), ms))
store.dispatch(actionDefferredPromise(2000, () =>
            fetch('https://api.exchangeratesapi.io/latest')
                    .then(res => res.json())))

store.dispatch(actionPromise('categories', gql(url, `
    query cats($q: String){
        CategoryFind(query:$q){
            _id name goods{
                _id name
            }
        }
    }`, {q: JSON.stringify([{}])})))

const actionCategories = (name) => {
    
}


store.subscribe(() => console.log(store.getState()))

const actionLogin = (login, password) => 
    async dispatch => {
        let result = await dispatch(actionPromise('LOGIN', loginQuery(login, password)))
        console.log(result.data.login)
        dispatch({
            type: "LOGIN",
            payload: result.data.login 
         })
    }

const actionLogout = () => 
    async dispatch => {
        await dispatch(actionPromise('LOGIN', undefined))
        dispatch({
            type: "LOGOUT",
        })
    }

const actionRegister = (login, password) =>
    actionPromise('REGISTER', registerQuery(login, password)) //REGISTER

const CategoriesForm = (categories) => {

}

const LoginForm = ({onLogin, btnText='Login'}) => {
    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')
    return (
        <div className='LoginForm'>
            <input type='text' 
                value={login} 
                onChange={e => setLogin(e.target.value)}/>
                <input type='text' 
                value={password} 
                onChange={e => setPassword(e.target.value)}/>
            <button onClick={() => {onLogin(login, password)}}>{btnText}</button>
        </div>
    )
}

const RegisterForm = ({onRegister, btnText='register'}) => {
    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')
    return (
        <div className='RegisterForm'>
            <input type='text' 
                value={login} 
                onChange={e => setLogin(e.target.value)}/>
                <input type='text' 
                value={password} 
                onChange={e => setPassword(e.target.value)}/>
            <button onClick={() => {onRegister(login, password)}}>{btnText}</button>
        </div>
    )
}

const Login = ({loginData:{payload, token}={}}) => {
    let username = 'anon';
    if (token !== undefined) {
        return <h1>{payload.sub.login}</h1>
    } else return <h1>{username}</h1>
}

const CLoginForm = connect(null, {onLogin: actionLogin})(LoginForm)
const CRegisterForm = connect(null, {onRegister: actionRegister})(RegisterForm)
// const CTablo = connect(s => ({children: s.login && s.login.status}))('h1')

const CMyLogin = connect(s => ({loginData: s.auth.payload == undefined ? 'anon' : s.auth}))(Login)
const CLogout = connect(s => ({children: s.auth.payload == undefined ? 'anon' : s.auth.payload.sub.login}), {onClick: actionLogout})("button")

function App() {
  //const [startValue, setStartValue] = useState(0)
  return (
      <>
        <Provider store = {store}>
        <CMyLogin/>
        <CLoginForm/>
        <CLogout/>
        <CRegisterForm/>
        {/* <CTablo/> */}
        {/* <LoginForm onLogin={(login, password) => console.log(login, password)}/> */}
        </Provider>
      </>
  );
}

export default App;
