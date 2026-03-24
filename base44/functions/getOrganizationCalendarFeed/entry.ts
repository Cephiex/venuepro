Deno.serve((req) => {
    try {
        const url = new URL(req.url);
        const organization_id = url.searchParams.get('organization_id');
        const building_id = url.searchParams.get('building_id');

        if (!organization_id || !building_id) {
            return new Response('Missing parameters', { status: 400 });
        }
        
        // This is a temporary diagnostic response.
        return new Response(`OK. Org: ${organization_id}, Building: ${building_id}`, {
            headers: { 'Content-Type': 'text/plain' },
            status: 200
        });

    } catch (error) {
        return new Response('Error in diagnostic function: ' + error.message, {
            status: 500
        });
    }
});