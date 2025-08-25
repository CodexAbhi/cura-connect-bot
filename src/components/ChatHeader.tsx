import { Heart, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ChatHeader() {
  return (
    <div className="p-6 bg-card border-b border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-medical-primary/10 rounded-lg">
          <Heart className="h-6 w-6 text-medical-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">MediAssist AI</h1>
          <p className="text-sm text-muted-foreground">Your AI Healthcare Companion</p>
        </div>
      </div>
      
      <Alert className="bg-medical-warning/10 border-medical-warning/20">
        <AlertTriangle className="h-4 w-4 text-medical-warning" />
        <AlertDescription className="text-medical-warning">
          <strong>Medical Disclaimer:</strong> This AI provides general health information only. 
          Always consult qualified healthcare professionals for medical advice, diagnosis, or treatment.
        </AlertDescription>
      </Alert>
      
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Powered by Mistral AI • Your privacy is protected</span>
      </div>
    </div>
  );
}