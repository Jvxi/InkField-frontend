#!/usr/bin/env bash
# Claude Code Status Line - compact one-liner
# Shows: model | shortened cwd | total tokens | context% | rate limits

input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "unknown"')
cwd=$(echo "$input" | jq -r '.workspace.current_dir // empty')
total_in=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_out=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
five_h=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
seven_d=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')

# Shorten cwd: replace home with ~, then show last 2 path components if deep
if [ -n "$cwd" ]; then
  home_dir="$HOME"
  short="${cwd/#$home_dir/~}"
  # If path is long, show ~/.../<parent>/<dir>
  depth=$(echo "$short" | tr -cd '/' | wc -c)
  if [ "$depth" -gt 3 ]; then
    dir=$(basename "$short")
    parent=$(basename "$(dirname "$short")")
    prefix=$(echo "$short" | sed "s|/[^/]*/[^/]*$||")
    short="$prefix/$parent/$dir"
  fi
else
  short="~"
fi

# Total tokens (input + output), formatted with K suffix
total=$((total_in + total_out))
if [ "$total" -ge 1000000 ]; then
  token_str=$(awk "BEGIN {printf \"%.1fM\", $total/1000000}")
elif [ "$total" -ge 1000 ]; then
  token_str=$(awk "BEGIN {printf \"%.1fK\", $total/1000}")
else
  token_str="${total}"
fi

# Build output
parts=("$model" "$short" "${token_str}tok")

if [ -n "$used_pct" ]; then
  parts+=("ctx:$(printf '%.0f' "$used_pct")%")
fi

rate_parts=""
if [ -n "$five_h" ]; then
  rate_parts="5h:$(printf '%.0f' "$five_h")%"
fi
if [ -n "$seven_d" ]; then
  [ -n "$rate_parts" ] && rate_parts="$rate_parts "
  rate_parts="${rate_parts}7d:$(printf '%.0f' "$seven_d")%"
fi
[ -n "$rate_parts" ] && parts+=("$rate_parts")

# Join with |
IFS='|'
echo "${parts[*]}"
