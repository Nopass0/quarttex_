"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useTraderAuth } from "@/stores/auth";
import { traderApi } from "@/services/api";
import { toast } from "sonner";

interface TraderProfile {
  id: number;
  numericId: number;
  email: string;
}

export function TraderHeader() {
  const router = useRouter();
  const logout = useTraderAuth((state) => state.logout);
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);

  useEffect(() => {
    // Load team state from localStorage
    const savedTeamState = localStorage.getItem("teamEnabled");
    if (savedTeamState !== null) {
      setTeamEnabled(savedTeamState === "true");
    }

    // Fetch trader profile
    fetchTraderProfile();
  }, []);

  useEffect(() => {
    // Save team state to localStorage whenever it changes
    localStorage.setItem("teamEnabled", teamEnabled.toString());
  }, [teamEnabled]);

  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile();
      if (response) {
        setTraderProfile({
          id: response.id || 0,
          numericId: response.numericId || 0,
          email: response.email || "trader@example.com"
        });
      }
    } catch (error) {
      console.error("Failed to fetch trader profile:", error);
      setTraderProfile({
        id: 0,
        numericId: 0,
        email: "trader@example.com"
      });
    }
  };

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("trader-auth");
    }
    router.push("/trader/login");
  };

  return (
    <div className="flex items-center gap-4">
      {/* Team toggle switch */}
      <div className="flex items-center gap-2">
        <Label htmlFor="team-switch" className="text-sm text-gray-700">
          Команда
        </Label>
        <Switch
          id="team-switch"
          checked={teamEnabled}
          onCheckedChange={setTeamEnabled}
        />
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-sm font-normal hover:bg-black/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-4 w-4 text-[#006039]" />
              </div>
              <span className="text-gray-700 font-medium">
                #{traderProfile?.numericId?.toString().padStart(4, "0") || "0000"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-[#006039]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:text-red-600 hover:bg-gray-50 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4 text-[#006039]" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}