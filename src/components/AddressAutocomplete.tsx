import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Program } from "@/hooks/usePrograms";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  programs: Program[];
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

export const AddressAutocomplete = ({
  value,
  onChange,
  programs,
  placeholder = "Enter address",
  id,
  className,
  disabled = false,
}: AddressAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the filter value to reduce expensive operations
  const debouncedValue = useDebounce(value, 200);

  // Filter programs based on debounced input - match by name or address
  const filteredPrograms = useMemo(
    () =>
      debouncedValue.trim()
        ? programs.filter(
            (p) =>
              p.name.toLowerCase().includes(debouncedValue.toLowerCase()) ||
              p.address.toLowerCase().includes(debouncedValue.toLowerCase()),
          )
        : [],
    [debouncedValue, programs],
  );

  const showDropdown = isOpen && filteredPrograms.length > 0 && !disabled;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when filtered results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredPrograms.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleSelect = (program: Program) => {
    onChange(program.address);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredPrograms.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredPrograms.length) {
          handleSelect(filteredPrograms[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const listboxId = id ? `${id}-listbox` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => !disabled && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn("h-10", className)}
        autoComplete="off"
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
      />
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul id={listboxId} role="listbox" className="max-h-60 overflow-auto py-1">
            {filteredPrograms.map((program, index) => (
              <li
                key={program.id}
                role="option"
                aria-selected={highlightedIndex === index}
                onClick={() => handleSelect(program)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm",
                  highlightedIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <div className="font-medium">{program.name}</div>
                <div className="text-xs text-muted-foreground">{program.address}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
