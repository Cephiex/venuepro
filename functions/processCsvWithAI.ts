import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { parse } from 'https://deno.land/std@0.224.0/csv/mod.ts';

// This function is now optimized to be extremely fast. It only parses the CSV and returns raw data.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate the user
        const user = await base44.auth.me();
        if (!user || !user.building_id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { file_url } = await req.json();
        if (!file_url) {
            return new Response(JSON.stringify({ error: 'file_url is required' }), { status: 400 });
        }

        // 1. Fast Fetch & Parse
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch CSV file. Status: ${fileResponse.statusText}`);
        }
        const csvContent = await fileResponse.text();
        if (!csvContent.trim()) {
            throw new Error("The CSV file is empty.");
        }
        
        const parsedData = parse(csvContent, { header: true, skipFirstRow: false });
        if (!parsedData || parsedData.length === 0) {
            throw new Error("Could not parse any data rows from the CSV file. Please check the format.");
        }

        // 2. Return the raw parsed data immediately. No AI call here.
        return new Response(JSON.stringify(parsedData), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Backend function error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});