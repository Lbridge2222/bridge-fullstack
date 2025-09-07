import { Link } from "react-router-dom";
import { MessageSquare, Brain } from "lucide-react";

export default function Labs() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Labs</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/settings/ai/nlq" className="border rounded p-4 hover:bg-slate-50 flex items-center gap-3">
          <MessageSquare className="text-slate-600" />
          <div>
            <div className="font-medium text-slate-900">Natural Language Queries</div>
            <div className="text-sm text-slate-600">RAG answers with citations</div>
          </div>
        </Link>
        <Link to="/settings/ai/advanced-ml" className="border rounded p-4 hover:bg-slate-50 flex items-center gap-3">
          <Brain className="text-slate-600" />
          <div>
            <div className="font-medium text-slate-900">Advanced ML Models</div>
            <div className="text-sm text-slate-600">Model exploration and experiments</div>
          </div>
        </Link>
      </div>
    </div>
  );
}


