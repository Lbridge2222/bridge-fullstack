import DefaultLayout from '../layouts/DefaultLayout'
import StatCard from '../components/StatCard'
import { FaUserGraduate, FaEnvelope, FaChartLine } from 'react-icons/fa'

export default function Dashboard() {
  return (
    <DefaultLayout>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Applicants" value={832} icon={<FaUserGraduate size={24} />} />
        <StatCard title="Emails Sent" value={4123} icon={<FaEnvelope size={24} />} />
        <StatCard title="Conversion Rate" value="27.6%" icon={<FaChartLine size={24} />} />
      </div>
    </DefaultLayout>
  )
}