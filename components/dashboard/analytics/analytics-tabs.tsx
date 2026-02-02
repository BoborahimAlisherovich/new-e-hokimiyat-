import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AnalyticsTabs() {
  return (
    <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 rounded-xl p-1">
          <TabsTrigger
            value="status"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Holat bo'yicha
          </TabsTrigger>
          <TabsTrigger
            value="sector"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Soha bo'yicha
          </TabsTrigger>
          <TabsTrigger
            value="organizations"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Tashkilotlar
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </section>
  )
}
