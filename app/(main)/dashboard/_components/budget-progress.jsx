"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBudget } from "@/actions/budget";

export function BudgetProgress({ initialBudget, currentExpenses }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(
    initialBudget?.amount?.toString() || ""
  );

  const {
    loading: isLoading,
    fn: updateBudgetFn,
    data: updatedBudget,
    error,
  } = useFetch(updateBudget);

  const percentUsed = initialBudget
    ? (currentExpenses / initialBudget.amount) * 100
    : 0;

  const handleUpdateBudget = async () => {
    const amount = parseFloat(newBudget);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    await updateBudgetFn(amount);
  };

  const handleCancel = () => {
    setNewBudget(initialBudget?.amount?.toString() || "");
    setIsEditing(false);
  };

  useEffect(() => {
    if (updatedBudget?.success) {
      setIsEditing(false);
      toast.success("Budget updated successfully");
    }
  }, [updatedBudget]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update budget");
    }
  }, [error]);

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 card-hover animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center animate-pulse-glow icon-hover">
            <Pencil className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Monthly Budget
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Default Account</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="w-32 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                placeholder="Enter amount"
                autoFocus
                disabled={isLoading}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUpdateBudget}
                disabled={isLoading}
                className="hover:bg-green-600/20"
              >
                <Check className="h-4 w-4 text-green-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                disabled={isLoading}
                className="hover:bg-red-600/20"
              >
                <X className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          ) : (
            <>
              <div className="text-right">
                <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
                  {initialBudget
                    ? `$${currentExpenses.toFixed(2)} of $${initialBudget.amount.toFixed(2)} spent`
                    : "No budget set"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-300"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {initialBudget && (
          <div className="space-y-2">
            <Progress
              value={percentUsed}
              extraStyles={`${
                // add to Progress component
                percentUsed >= 90
                  ? "bg-red-500"
                  : percentUsed >= 75
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
            />
            <p className="text-xs text-muted-foreground text-right">
              {percentUsed.toFixed(1)}% used
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
