import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, Bot, User, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: Product[];
}

export const AIChatbox = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Send initial greeting when component mounts
    const sendGreeting = async () => {
      const greetingMessage: Message = { 
        role: "assistant", 
        content: "👋 Hi! Welcome to our store! I'm your AI shopping assistant. I can help you find products, answer questions, and make recommendations. What are you looking for today?"
      };
      setMessages([greetingMessage]);
    };
    sendGreeting();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { messages: [...messages, userMessage] },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.choices[0].message.content,
        products: data.products,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-2xl border-primary/30 bg-card/95 backdrop-blur-sm rounded-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-2xl">
        <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold">AI Shopping Assistant</h3>
          <p className="text-xs opacity-90">Ask me anything!</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index}>
              <div
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[75%] ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-secondary" />
                  </div>
                )}
              </div>
              
              {/* Display Products */}
              {message.products && message.products.length > 0 && (
                <div className="mt-3 ml-11 space-y-2">
                  {message.products.map((product) => (
                    <Card key={product.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer border-primary/20">
                      <div className="flex gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                          <p className="text-sm font-bold text-primary mt-1">₹{product.price}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-muted">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about products..."
            disabled={isLoading}
            className="flex-1 rounded-xl border-primary/20 focus:ring-primary"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-gradient-to-br from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 rounded-xl h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
