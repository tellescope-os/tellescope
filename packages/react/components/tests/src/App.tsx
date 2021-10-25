import React from 'react';

import {
  emailInput,
  passwordInput,
  FormBuilder,
} from "@tellescope/react-components"

import {
  BrowserRouter as Router,
  Redirect,
  Route,
  Switch,
  useHistory,
} from "react-router-dom"

function App() {
  return (
    <Router>
    <Switch>   
      <Route exact path="/">
        <ViewSelector/> 
      </Route>
      <Route exact path="/test-form">
        <TestForm/> 
      </Route>

      <Route>
        <Redirect to="/"/>
      </Route>
    </Switch>
    </Router>
  );
}

const ViewSelector = () => {
  const history = useHistory()

  return (
    <div>
      <button onClick={() => history.push('/test-form')}>test-form</button>
    </div>
  )
}


const TestForm = () => {
  type FormType = { email: string, password: string }

  return (
    <FormBuilder<FormType>
      fields={{
        email: emailInput({ id: 'email' }),
        password: passwordInput({ id: 'password' }),
      }}
      submitText="Login"
      submittingText="Logging in"
      onSubmit={s => new Promise((resolve, reject) => 
        setTimeout(() => {
          alert(JSON.stringify(s, null, 2))
          resolve()
        }, 1000)
      )}
    />
  )
}

export default App;
