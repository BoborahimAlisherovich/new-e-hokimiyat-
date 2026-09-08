import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TabsContent } from "@/components/ui/tabs"

interface TaskItem {
  id: number
  title: string
  assignee: string
  deadline: string
  status: string
  priority: string
}

interface SettingsTasksTabProps {
  tasks: TaskItem[]
}

export function SettingsTasksTab({ tasks }: SettingsTasksTabProps) {
  return (
    <TabsContent value="tasks">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Topshiriqlar</CardTitle>
          <CardDescription className="text-gray-600">Barcha topshiriqlar ro'yxati</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sarlavha</TableHead>
                <TableHead>Mas'ul</TableHead>
                <TableHead>Muddat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Muhimlik</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.id}</TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.assignee}</TableCell>
                  <TableCell>{task.deadline}</TableCell>
                  <TableCell>
                    <Badge variant={task.status === "Bajarildi" ? "default" : task.status === "Jarayonda" ? "secondary" : "outline"}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.priority === "Yuqori" ? "destructive" : task.priority === "O'rta" ? "default" : "secondary"
                      }
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
