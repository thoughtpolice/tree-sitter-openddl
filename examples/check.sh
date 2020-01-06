for x in examples/*; do
  [ "$x" == "examples/check.sh" ] && continue

  if tree-sitter parse "$x" > /dev/null; then
    echo "$x: parse ok";
  else
    echo "$x: parse failed"
    exit 1
  fi
done
