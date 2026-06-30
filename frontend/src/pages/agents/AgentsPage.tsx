import { motion } from 'framer-motion'
import { Bot, CheckCircle, Loader, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const agents = [
  { name: 'Research Agent', role: 'Market Research Specialist', icon: '🔍', color: 'bg-blue-500' },
  { name: 'Competitor Agent', role: 'Competitor Intelligence Expert', icon: '🎯', color: 'bg-violet-500' },
  { name: 'Business Plan Agent', role: 'Business Strategy Consultant', icon: '📋', color: 'bg-emerald-500' },
  { name: 'Finance Agent', role: 'CFO Advisor', icon: '💰', color: 'bg-amber-500' },
  { name: 'Marketing Agent', role: 'Chief Marketing Officer', icon: '📣', color: 'bg-pink-500' },
]

export default function AgentsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">AI Agents</h1>
        <p className="text-muted-foreground text-sm mt-1">Your team of specialized AI employees</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${agent.color} bg-opacity-15 flex items-center justify-center text-2xl`}>
                    {agent.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.role}</p>
                  </div>
                  <div className="ml-auto">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <Bot className="w-12 h-12 text-primary mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground text-sm">
            Create a project and run AI analysis to see your agents in action
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
