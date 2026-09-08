import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TabsContent } from "@/components/ui/tabs"

interface ApplicationItem {
  id: number
  fullName: string
  subject: string
  status: string
  date: string
  priority: string
}

interface SettingsApplicationsTabProps {
  applications: ApplicationItem[]
}

export function SettingsApplicationsTab({ applications }: SettingsApplicationsTabProps) {
  return (
    <TabsContent value="applications">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Murojatlar</CardTitle>
          <CardDescription className="text-gray-600">Barcha kelgan murojatlar ro'yxati</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>F.I.O</TableHead>
                <TableHead>Mavzu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Muhimlik</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>{app.id}</TableCell>
                  <TableCell>{app.fullName}</TableCell>
                  <TableCell>{app.subject}</TableCell>
                  <TableCell>
                    <Badge variant={app.status === "Yangi" ? "default" : app.status === "Qabul qilindi" ? "secondary" : "outline"}>
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{app.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.priority === "Yuqori" ? "destructive" : app.priority === "O'rta" ? "default" : "secondary"
                      }
                    >
                      {app.priority}
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
