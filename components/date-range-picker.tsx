'use client'

import * as React from 'react'
import { format, isValid, parse } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  className?: string
}

const DISPLAY_FORMAT = 'MM/dd/yyyy'
// Typed dates are accepted in US order or ISO, with or without zero-padding.
const INPUT_FORMATS = ['MM/dd/yyyy', 'M/d/yyyy', 'yyyy-MM-dd', 'MM-dd-yyyy', 'M-d-yyyy']
const MIN_DATE = new Date('1990-01-01T00:00:00')

function isOutOfRange(date: Date) {
  return date > new Date() || date < MIN_DATE
}

function parseTyped(text: string): Date | undefined {
  const trimmed = text.trim()
  for (const fmt of INPUT_FORMATS) {
    const date = parse(trimmed, fmt, new Date())
    // Reject partial matches like "1/1/20" parsing as year 20.
    if (isValid(date) && date.getFullYear() >= 1000) return date
  }
  return undefined
}

function display(date: Date | undefined) {
  return date ? format(date, DISPLAY_FORMAT) : ''
}

interface DateFieldProps {
  id: string
  label: string
  value: Date | undefined
  onCommit: (date: Date | undefined) => void
}

/**
 * A text field that keeps its own draft while the user types and only
 * reports a date once the text parses, so half-typed input never clobbers
 * the range.
 */
function DateField({ id, label, value, onCommit }: DateFieldProps) {
  const [text, setText] = React.useState(display(value))
  const [invalid, setInvalid] = React.useState(false)
  const [prevValue, setPrevValue] = React.useState(value)

  // Follow changes made from the calendar.
  if (value?.getTime() !== prevValue?.getTime()) {
    setPrevValue(value)
    setText(display(value))
    setInvalid(false)
  }

  const commit = () => {
    if (!text.trim()) {
      setInvalid(false)
      onCommit(undefined)
      return
    }
    const date = parseTyped(text)
    if (!date || isOutOfRange(date)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setText(display(date))
    onCommit(date)
  }

  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="MM/DD/YYYY"
        value={text}
        aria-invalid={invalid}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
      />
      {invalid && (
        <p className="text-xs text-destructive">
          Enter a date between 01/01/1990 and today
        </p>
      )}
    </div>
  )
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <div className="grid flex-1 grid-cols-2 gap-2">
        <DateField
          id="start-date"
          label="Start"
          value={dateRange?.from}
          onCommit={(from) => onDateRangeChange({ from, to: dateRange?.to })}
        />
        <DateField
          id="end-date"
          label="End"
          value={dateRange?.to}
          onCommit={(to) => onDateRangeChange({ from: dateRange?.from, to })}
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mt-5 shrink-0"
            aria-label="Pick dates from a calendar"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            disabled={isOutOfRange}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
