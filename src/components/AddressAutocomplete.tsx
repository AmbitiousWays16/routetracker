import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Program } from "@/hooks/usePrograms";
import { UserAddress } from "@/hooks/useUserAddresses";
import { cn } from "@/lib/utils";
import { Save, Building2, MapPin } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  programs: Program[];
  userAddresses?: UserAddress[];
  onSaveAddress?: (name: string, address: string) => Promise<UserAddress | null>;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

// Debounce hook to prevent excessive filtering
const useDebounce = <T,>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

interface AddressItem {
  id: string;
  name: string;
  address: string;
  type: 'program' | 'user';
}

export const AddressAutocomplete = ({
  value,
  onChange,
  programs,
  userAddresses = [],
  onSaveAddress,
  placeholder = "Enter address",
  id,
  className,
  disabled = false,
}: AddressAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the filter value to reduce expensive operations
  const debouncedValue = useDebounce(value, 200);

  // Combine programs and user addresses into a unified list
  const allAddresses = useMemo((): AddressItem[] => {
    const programItems: AddressItem[] = programs.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      type: 'program' as const,
    }));

    const userItems: AddressItem[] = userAddresses.map((a) => ({
      id: a.id,
      name: a.name,
      address: a.address,
      type: 'user' as const,
    }));

    return [...programItems, ...userItems];
  }, [programs, userAddresses]);

  // Filter addresses based on debounced input - match by name or address
  const filteredAddresses = useMemo(
    () =>
      debouncedValue.trim()
        ? allAddresses.filter(
            (item) =>
              item.name.toLowerCase().includes(debouncedValue.toLowerCase()) ||
              item.address.toLowerCase().includes(debouncedValue.toLowerCase()),
          )
        : [],
    [debouncedValue, allAddresses],
  );

  // Check if current value is a new address (not in saved list)
  const isNewAddress = useMemo(() => {
    if (!value.trim() || value.length < 10) return false;
    return !allAddresses.some(
      (item) => item.address.toLowerCase() === value.toLowerCase()
    );
  }, [value, allAddresses]);

  const showDropdown = isOpen && filteredAddresses.length > 0 && !disabled;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSavePrompt(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when filtered results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredAddresses.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSavePrompt(false);
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleSelect = (item: AddressItem) => {
    onChange(item.address);
    setIsOpen(false);
    setShowSavePrompt(false);
    inputRef.current?.focus();
  };

  const handleSaveAddress = async () => {
    if (!onSaveAddress || !saveName.trim() || !value.trim()) return;

    setIsSaving(true);
    try {
      await onSaveAddress(saveName.trim(), value.trim());
      setShowSavePrompt(false);
      setSaveName("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredAddresses.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredAddresses.length) {
          handleSelect(filteredAddresses[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setShowSavePrompt(false);
        break;
    }
  };

  const listboxId = id ? `${id}-listbox` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-1">
        <Input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn("h-10 flex-1", className)}
          autoComplete="off"
          disabled={disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
        />
        {isNewAddress && onSaveAddress && !showSavePrompt && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={() => setShowSavePrompt(true)}
            title="Save this address"
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSavePrompt && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">Save this address for quick access:</p>
          <div className="flex gap-2">
            <Input
              placeholder="Address name (e.g., Home, Doctor)"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="h-9 flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveName.trim()) {
                  e.preventDefault();
                  handleSaveAddress();
                } else if (e.key === 'Escape') {
                  setShowSavePrompt(false);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAddress}
              disabled={!saveName.trim() || isSaving}
              className="h-9"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {showDropdown && !showSavePrompt && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul id={listboxId} role="listbox" className="max-h-60 overflow-auto py-1">
            {filteredAddresses.map((item, index) => (
              <li
                key={`${item.type}-${item.id}`}
                role="option"
                aria-selected={highlightedIndex === index}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm",
                  highlightedIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <div className="flex items-center gap-2">
                  {item.type === 'program' ? (
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.address}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
