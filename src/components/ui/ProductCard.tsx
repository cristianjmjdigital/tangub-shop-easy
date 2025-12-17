import { Card, CardHeader, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface ProductCardProps {
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  business: string;
  location: string;
  discount?: number;
  imageUrl?: string;
  image?: string; // alias used by some pages
  description?: string;
  vendorId?: string;
  storePath?: string;
  onAdd?: () => void;
  adding?: boolean;
  sizeOptions?: string[];
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}

const ProductCard = ({
  name,
  price,
  originalPrice,
  rating,
  business,
  location,
  discount,
  imageUrl,
  image,
  description,
  vendorId,
  storePath,
  onAdd,
  adding,
  sizeOptions,
  selectedSize,
  onSelectSize
}: ProductCardProps) => {
  const src = imageUrl || image || "/placeholder.svg";
  const storeHref = storePath || (vendorId ? `/business/${vendorId}` : undefined);
  const reviewsHref = vendorId ? `/business/${vendorId}/reviews` : (storeHref ? `${storeHref}/reviews` : '/ratings');
  return (
    <Card className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
      {storeHref ? (
        <Link to={storeHref} className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
          <div className="aspect-square bg-white relative overflow-hidden rounded-xl">
            <img
              src={src}
              alt={name}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                if (e.currentTarget.src.endsWith("/placeholder.svg")) return;
                e.currentTarget.src = "/placeholder.svg";
              }}
              loading="lazy"
            />
          </div>
          {discount && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              -{discount}%
            </Badge>
          )}
          <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground backdrop-blur-sm max-w-[70%] truncate">
            Visit store
          </Badge>
        </Link>
      ) : (
        <div className="relative">
          <div className="aspect-square bg-white relative overflow-hidden rounded-xl">
            <img
              src={src}
              alt={name}
              className="object-cover w-full h-full"
              onError={(e) => {
                if (e.currentTarget.src.endsWith("/placeholder.svg")) return;
                e.currentTarget.src = "/placeholder.svg";
              }}
              loading="lazy"
            />
          </div>
          {discount && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              -{discount}%
            </Badge>
          )}
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center text-xs text-muted-foreground mb-2 gap-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{location}</span>
        </div>
        <CardTitle className="text-lg leading-tight">
          {storeHref ? (
            <Link to={storeHref} className="hover:text-primary transition-colors">
              {name}
            </Link>
          ) : (
            name
          )}
        </CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs mt-1">
          <span className="text-muted-foreground">Sold by</span>
          {storeHref ? (
            <Link to={storeHref} className="inline-flex items-center gap-1 text-primary hover:underline">
              {business}<ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : (
            <span className="text-muted-foreground">{business}</span>
          )}
        </CardDescription>
        <div className="flex items-center mb-3">
          <Link to={reviewsHref} className="inline-flex items-center text-foreground hover:text-primary transition-colors">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="ml-1 text-sm font-medium underline-offset-4 hover:underline">{rating}</span>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {description || 'This product is available from this vendor. Tap to view the full store.'}
        </p>
        {sizeOptions && sizeOptions.length > 0 && (
          <div className="space-y-2 mb-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Available Sizes</div>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => {
                const selected = selectedSize === size;
                return (
                  <Button
                    key={size}
                    type="button"
                    size="sm"
                    variant={selected ? 'secondary' : 'outline'}
                    className="h-8 px-3"
                    onClick={() => onSelectSize?.(size)}
                  >
                    {size}
                  </Button>
                );
              })}
            </div>
            {!selectedSize && <div className="text-[11px] text-muted-foreground">Select a size to add to cart.</div>}
          </div>
        )}
        <div className="flex items-center">
          <span className="text-xl font-bold text-primary">
            ₱{price.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
          </span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through ml-2">
              ₱{originalPrice.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
            </span>
          )}
        </div>
        {onAdd && (
          <Button
            className="mt-4 w-full"
            variant="default"
            size="sm"
            disabled={adding || (sizeOptions && sizeOptions.length > 0 && !selectedSize)}
            onClick={onAdd}
          >
            {adding ? 'Adding...' : 'Add to Cart'}
          </Button>
        )}
      </CardHeader>
    </Card>
  );
};

export default ProductCard;
