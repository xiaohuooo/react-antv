import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useEffect } from 'react'
import { useAppStore } from './stores/appStore'
import MenuBar from './components/layout/MenuBar'
import Toolbar from './components/layout/Toolbar'
import LeftPanel from './components/layout/LeftPanel'
import CenterTabs from './components/layout/CenterTabs'
import RightPanel from './components/layout/RightPanel'
import './App.css'

function App() {
  const theme = useAppStore((s) => s.theme)
  const leftPanelVisible = useAppStore((s) => s.leftPanelVisible)
  const rightPanelVisible = useAppStore((s) => s.rightPanelVisible)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const { darkAlgorithm } = antdTheme
  const antdConfig = {
    algorithm: theme === 'dark' ? darkAlgorithm : undefined,
    token: {
      colorPrimary: '#1677ff',
      // borderRadius: 4,
    },
  }

  return (
    <ConfigProvider locale={zhCN} theme={antdConfig}>
      <AntdApp>
        <div className="app-container">
          <MenuBar />
          <Toolbar />
          <div className="app-body">
            {leftPanelVisible && <LeftPanel />}
            <CenterTabs />
            {rightPanelVisible && <RightPanel />}
          </div>
        </div>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
