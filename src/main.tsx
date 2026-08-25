import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  //***注意:去掉<React.StrictMode>否则会多执行一次,因在严格模式下,React将会调用两次组件方法,这是为了帮助发现意外问题,但这只是开发模式下的行为,不会影响生产模式
  //<StrictMode>
    <App />
  //</StrictMode>,
)
