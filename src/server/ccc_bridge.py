import sys
import json
import os
import subprocess

def run_ccc_command(cmd_list):
    try:
        # We try to run the CLI directly as it might be installed in the path
        result = subprocess.run(cmd_list, capture_output=True, text=True)
        if result.returncode == 0:
            return {"success": True, "stdout": result.stdout, "stderr": result.stderr}
        else:
            return {"success": False, "error": result.stderr or result.stdout}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No command provided"}))
        return

    command = sys.argv[1]
    args = sys.argv[2:]

    try:
        if command == "index":
            repo_path = args[0] if args else "."
            result = run_ccc_command(["ccc", repo_path])
            print(json.dumps(result))
        
        elif command == "query":
            if not args:
                print(json.dumps({"success": False, "error": "No query string provided"}))
                return
            
            # Default query command
            cmd = ["ccc", "query"]
            
            # Check for --type
            if "--type" in args:
                idx = args.index("--type")
                type_val = args[idx+1]
                cmd.extend(["--type", type_val])
                # Remove --type and its value from args to get the actual query term
                args.pop(idx+1)
                args.pop(idx)
            
            query_str = args[0]
            cmd.append(query_str)
            cmd.extend(["--format", "json"]) # Always ask for JSON in bridge
            
            result = run_ccc_command(cmd)
            if result["success"]:
                try:
                    # Attempt to parse stdout as JSON
                    result["data"] = json.loads(result["stdout"])
                except:
                    result["data"] = result["stdout"]
            print(json.dumps(result))
            
        elif command == "align":
            cmd = ["ccc", "align", "--format", "json"]
            if args:
                cmd.extend(["--pkml", args[0]])
            result = run_ccc_command(cmd)
            if result["success"]:
                try:
                    result["data"] = json.loads(result["stdout"])
                except:
                    result["data"] = result["stdout"]
            print(json.dumps(result))

        elif command == "workspace":
            sub_command = args[0] if args else "generate"
            cmd = ["ccc", "workspace", sub_command]
            # Add remaining args
            if len(args) > 1:
                cmd.extend(args[1:])
            
            result = run_ccc_command(cmd)
            print(json.dumps(result))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown bridge command: {command}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
