import { FileText, Eye } from "lucide-react";
import { useFichaStats } from "@/hooks/useFichas";

const Dashboard = () => {
  const { data: stats } = useFichaStats();

  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-lg font-semibold tabular-nums text-foreground">{stats?.total ?? 0}</span>
        <span className="text-xs text-muted-foreground">fichas</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span className="text-lg font-semibold tabular-nums text-foreground">{stats?.monthlyVisits ?? 0}</span>
        <span className="text-xs text-muted-foreground">visitas / mes</span>
      </div>
    </div>
  );
};

export default Dashboard;
