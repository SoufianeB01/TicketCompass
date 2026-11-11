import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetails from './pages/TicketDetails';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element= {<TicketDetails />} />
          <Route path="/employees" element={<h1>Employees</h1>} />
          <Route path="/analytics" element={<h1>Analytics</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;