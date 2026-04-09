import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Todo {
  id: number;
  text: string;
}

// Local in-memory "server"
let nextId = 1;
let serverTodos: Todo[] = [
  { id: nextId++, text: "Buy groceries" },
  { id: nextId++, text: "Walk the dog" },
];

async function getTodos() {
  await new Promise((r) => setTimeout(r, 300));
  return [...serverTodos];
}
async function addTodo(text: string): Promise<Todo> {
  await new Promise((r) => setTimeout(r, 700));
  if (Math.random() < 0.3) throw new Error("Server error");
  const todo = { id: nextId++, text };
  serverTodos.push(todo);
  return todo;
}
async function deleteTodo(id: number) {
  await new Promise((r) => setTimeout(r, 500));
  serverTodos = serverTodos.filter((t) => t.id !== id);
}

export default function OptimisticMutation() {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: todos = [] } = useQuery({ queryKey: ["todos"], queryFn: getTodos });

  const add = useMutation({
    mutationFn: addTodo,
    onMutate: async (newText) => {
      await qc.cancelQueries({ queryKey: ["todos"] });
      const prev = qc.getQueryData<Todo[]>(["todos"]);
      // Optimistic insert
      qc.setQueryData<Todo[]>(["todos"], (old = []) => [...old, { id: -Date.now(), text: newText }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback
      qc.setQueryData(["todos"], ctx?.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  const remove = useMutation({
    mutationFn: deleteTodo,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["todos"] });
      const prev = qc.getQueryData<Todo[]>(["todos"]);
      qc.setQueryData<Todo[]>(["todos"], (old = []) => old.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["todos"], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  function handleAdd() {
    if (!text.trim()) return;
    add.mutate(text.trim());
    setText("");
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <p className="text-sm text-muted-foreground">Add has a 30% server failure rate to demo rollback.</p>

      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="New todo…" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <Button onClick={handleAdd} disabled={add.isPending}>
          {add.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
        </Button>
      </div>

      {add.isError && <p className="text-xs text-destructive">Failed to add — rolled back.</p>}

      <ul className="divide-y divide-border">
        {todos.map((todo) => (
          <li key={todo.id} className={`flex items-center justify-between py-2 ${todo.id < 0 ? "opacity-50" : ""}`}>
            <span className="text-sm">{todo.text}</span>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(todo.id)} disabled={todo.id < 0}>
              <Trash2 className="size-3 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
